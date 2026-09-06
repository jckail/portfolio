# Deployment Checklist

Everything the repository owner must provide to enable automatic deploys to
GCP Cloud Run. Once these steps are done, every merge to `main` builds,
pushes, deploys, and health-checks a new version with no further action.

## Where each kind of secret lives (and why it's safe in a public repo)

| Kind | Example | Where it goes | Public exposure |
|------|---------|---------------|-----------------|
| Runtime app secrets | Supabase keys, Anthropic API key, SendGrid key | **GCP Secret Manager** (written once via Terraform, mounted into Cloud Run as env vars) | Never in git or GitHub |
| Deploy identity | WIF provider name, deployer service-account email | **GitHub Actions repository secrets** | Encrypted; never shown in the UI, masked in logs, **not** available to fork PRs |
| Non-secret deploy config | project id, region, service name | **GitHub Actions repository variables** | Visible to repo collaborators only; harmless if leaked |
| Local dev config | `.env` at the repo root | Your machine only | Git-ignored |

GitHub Actions secrets are private even on a public repository: they are
encrypted at rest, redacted from workflow logs, and workflows triggered by
pull requests from forks never receive them. The `Deploy` workflow
additionally only runs on pushes to `main` and manual dispatch — never on
pull requests.

No service-account keys exist anywhere in this setup: GitHub authenticates
to GCP with short-lived OIDC tokens via Workload Identity Federation, and
the identity it can assume is restricted to this exact repository.

## One-time setup (owner checklist)

### 1. Apply the Terraform (locally, with your GCP owner credentials)

```bash
gcloud auth application-default login

cd infra
cp terraform.tfvars.example terraform.tfvars   # git-ignored
# Edit terraform.tfvars and fill in:
#   - project_id / region / service_name / artifact_repository (or keep defaults)
#   - github_repository = "jckail/portfolio"   <- enables keyless CI deploys
#   - admin_email, resume_file, allowed_origins, production_url
#   - secrets = { supabase_url, supabase_anon_key, supabase_service_role,
#                 anthropic_api_key, sendgrid_api_key }
terraform init
terraform apply
```

This provisions Cloud Run, Artifact Registry, Secret Manager (with your
secret values), the runtime service account, and the GitHub deploy identity.

### 2. Add two GitHub **secrets**

GitHub repo → Settings → Secrets and variables → Actions → **Secrets** tab:

| Secret name | Value (from `terraform output`) |
|-------------|--------------------------------|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `terraform output -raw workload_identity_provider` |
| `GCP_DEPLOYER_SERVICE_ACCOUNT` | `terraform output -raw deployer_service_account` |

### 3. Add GitHub **variables**

Same page, **Variables** tab:

| Variable | Value | Required |
|----------|-------|----------|
| `GCP_PROJECT_ID` | your project id (e.g. `portfolio-383615`) | Yes — the workflow is skipped while unset |
| `GCP_REGION` | region | Only if not `us-central1` |
| `CLOUD_RUN_SERVICE` | service name | Only if not `quickresume` |
| `AR_REPOSITORY` | Artifact Registry repo | Only if not `portfolio` |

### 4. Verify

Push to `main` (or run the `Deploy` workflow manually from the Actions tab).
The workflow builds the image, pushes it tagged with the commit SHA, deploys
to Cloud Run, and polls `/api/health` until it returns 200.

## Rotating or changing a secret

- **Runtime secrets** (Supabase/Anthropic/SendGrid): update the value in
  `infra/terraform.tfvars`, run `terraform apply`, then redeploy (Cloud Run
  reads `latest` secret versions at instance startup).
- **Deploy identity**: these are resource names, not credentials — they only
  need updating if you recreate the Terraform resources.

## Optional but recommended (from ROADMAP.md)

- [x] **Terraform remote state**: done — the `backend "gcs"` block in
      `infra/versions.tf` is live (`portfolio-383615-terraform-state`).
      ⚠ The bucket itself is not managed by Terraform and has no explicit
      IAM, so any project Viewer can read the state — which holds all five
      secrets in plaintext. See `docs/audit-2026-09-06.md` §3 O1.
- [ ] ~~create a GCS bucket, uncomment the~~
  `backend "gcs"` block in `infra/versions.tf`, and run `terraform init
  -migrate-state`. Required before Terraform can run in CI.
- [x] **Uptime alerting**: done — `infra/monitoring.tf` provisions the check
      (now against `/api/health/ready`) and an alert policy.
      ⚠ The notification channel has never been verified, so it delivers
      nothing. See `docs/audit-2026-09-06.md` §3 O2.
- [ ] ~~a Cloud Monitoring uptime check on `/api/health`~~
  with a notification channel, managed in Terraform.

## Everyday deploys after setup

- Merge/push to `main` → automatic deploy via GitHub Actions.
- Manual fallback: `./helpers/deploy.sh` (builds, pushes, and deploys from
  your machine using your gcloud credentials and the root `.env`).
