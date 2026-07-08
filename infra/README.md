# Infrastructure (GCP / Terraform)

Terraform configuration for running the portfolio app on Google Cloud.

## What it manages

| Resource | Purpose |
|----------|---------|
| `google_project_service` | Enables the Cloud Run, Artifact Registry, Secret Manager, and IAM APIs |
| `google_artifact_registry_repository` | Docker repository for app images (keeps the 10 most recent) |
| `google_service_account` | Dedicated least-privilege runtime identity for Cloud Run |
| `google_secret_manager_secret*` | Supabase keys, Anthropic API key, SendGrid API key |
| `google_cloud_run_v2_service` | The app itself (public, autoscaled, health-checked via `/api/health`) |
| `google_iam_workload_identity_pool*` (optional) | Keyless GitHub Actions deployments, see below |

Secrets are mounted into the container as environment variables from Secret
Manager — they are never baked into the image or passed as plain `--set-env-vars`.

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/downloads) >= 1.5
- `gcloud` authenticated with permissions on the target project
  (`gcloud auth application-default login`)

## Usage

```bash
cd infra

# One-time setup
cp terraform.tfvars.example terraform.tfvars   # fill in real values (git-ignored)
terraform init

# Review and apply
terraform plan
terraform apply
```

### Deploying a new image version

1. Build and push the image (or use `../helpers/deploy.sh` which also does this):

   ```bash
   GIT_COMMIT=$(git rev-parse HEAD)
   REPO=$(terraform output -raw artifact_registry_repository)
   docker build -t "$REPO/quickresume:$GIT_COMMIT" --platform linux/amd64 -f ../helpers/Dockerfile.prod ..
   docker push "$REPO/quickresume:$GIT_COMMIT"
   ```

2. Point the service at the new tag:

   ```bash
   terraform apply -var "image_tag=$GIT_COMMIT"
   ```

### Continuous deployment from GitHub Actions

The repo ships a `Deploy` workflow (`.github/workflows/deploy.yml`) that
builds the production image and deploys it to Cloud Run on every push to
`main`, authenticating with Workload Identity Federation (no service-account
keys stored in GitHub). The full owner checklist, including where every kind
of secret lives, is in [`DEPLOYMENT.md`](../DEPLOYMENT.md).

To enable it:

1. Apply Terraform with the repository variable set:

   ```bash
   terraform apply -var "github_repository=<owner>/<repo>"
   ```

2. Add GitHub **repository secrets** from the Terraform outputs:

   | Secret | Terraform output |
   |--------|------------------|
   | `GCP_WORKLOAD_IDENTITY_PROVIDER` | `workload_identity_provider` |
   | `GCP_DEPLOYER_SERVICE_ACCOUNT` | `deployer_service_account` |

3. Add GitHub **repository variables**: `GCP_PROJECT_ID` (required — the
   workflow is skipped when unset), and optionally `GCP_REGION`,
   `CLOUD_RUN_SERVICE`, and `AR_REPOSITORY` if they differ from the defaults
   (`us-central1`, `quickresume`, `portfolio`).

The deployer service account can only push images, deploy revisions, and act
as the runtime service account; the OIDC provider only trusts tokens issued
for the configured repository.

### Remote state

State is local by default. For anything beyond a single-operator setup,
create a GCS bucket and uncomment the `backend "gcs"` block in `versions.tf`.

## Relationship to `helpers/deploy.sh`

`helpers/deploy.sh` is the fast path: it builds the image, pushes it to
Artifact Registry, and deploys a Cloud Run revision with `gcloud`, passing
configuration as plain environment variables.

Terraform is the source of truth for the infrastructure itself (APIs,
repository, service account, secrets, scaling policy). If you use both, run
`terraform apply` after `deploy.sh` deployments so drift (e.g. env var
changes) is reconciled.
