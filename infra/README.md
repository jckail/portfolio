# Infrastructure (GCP / Terraform)

Terraform configuration for running the portfolio app on Google Cloud.

## What it manages

| Resource | Purpose |
|----------|---------|
| `google_project_service` | Enables the Cloud Run, Artifact Registry, Secret Manager, IAM, Logging, Vertex AI and API Keys APIs |
| `google_artifact_registry_repository` | Docker repository for app images (keeps the 10 newest, deletes the rest after 30 days; dry-run first) |
| `google_service_account` | Dedicated least-privilege runtime identity for Cloud Run |
| `google_secret_manager_secret*` | Supabase keys, Anthropic API key, SendGrid API key; containers only for `contact-phone` and `vertex-api-key` |
| `google_service_account.vertex` | `portfolio-vertex`, the identity the Vertex API key is bound to (`vertex.tf`) |
| `google_logging_metric`, `google_monitoring_*` | Event counters, alert policies, uptime checks and the dashboard (`observability.tf`, `dashboard.tf`) |
| `google_billing_budget` (optional) | Monthly budgets with 50/90/100% and forecast alerts (`budget.tf`) |
| `google_cloud_run_v2_service` | The app itself (public, autoscaled, health-checked via `/api/health`) |
| `google_iam_workload_identity_pool*` (optional) | Keyless GitHub Actions deployments, see below |

Secrets are mounted into the container as environment variables from Secret
Manager — they are never baked into the image or passed as plain `--set-env-vars`.

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/downloads) >= 1.7
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

1. Build and push the image (do not use `../helpers/deploy.sh`; it is unsafe, see `../HANDOFF.md`):

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
   terraform apply -var "github_repository=<owner>/<repo>" -var "github_repository_id=<numeric-id>"
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
for the configured repository name and immutable ID, from `main` and
`.github/workflows/deploy.yml` on push or manual dispatch. The repository ID
default is for `jckail/portfolio`; obtain another repository's ID with
`gh api repos/OWNER/REPO --jq .id`.

Create a GitHub environment named `production` with a deployment branch rule
allowing only the `main` branch. Builds run in a separate job without cloud
credentials or OIDC permission. Deployment downloads only that run's artifact.

Credentialed Terraform planning on pull requests has been removed. Terraform
providers and data sources can execute code during init/plan, and state contains
runtime secrets even when input variables use placeholders. Run cloud-connected
plans only from a trusted operator checkout. PR CI still runs backend-free
Terraform validation without cloud credentials.

Apply these Terraform changes from an authenticated operator session to restrict
the existing WIF provider and disable the former planner service account and remove its
IAM grants. A Git push does **not** apply Terraform. See
[`docs/security-review-2026-09-05.md`](../docs/security-review-2026-09-05.md).

### Remote state

State lives in the GCS bucket named in the `backend "gcs"` block of
`versions.tf`. That bucket has been documented as readable by project Viewer
and as holding plaintext secrets (see `HANDOFF.md` and the audit docs), so
treat read access to it as access to production secrets and do not run a
blanket apply against it.

## Relationship to `helpers/deploy.sh`

Do not run `helpers/deploy.sh`. It builds and pushes an image and deploys a
Cloud Run revision with `gcloud`, but it replaces the Secret Manager bindings
with plain environment variables and skips the zero-traffic canary
(`../HANDOFF.md`). Production ships only through the GitHub Actions `Deploy`
workflow.

Terraform describes the infrastructure itself (APIs, repository, service account,
secrets, scaling policy). When using multiple deployment paths, reconcile drift
with the authoritative state and a reviewed plan. Do not run a blanket apply
merely to synchronize a deployment; review image and secret changes explicitly.


### Migrating existing CI deployment permissions

The CI deployer uses Cloud Run Developer on this service and Artifact Registry
Writer on this repository, plus Service Account User on the exact runtime
identity. Creating the service/repository and changing their IAM policies remain
administrative operations. Deployment still runs application code with the
runtime identity's permissions; this narrowing does not revoke application keys.

Existing installations must migrate the former project-level `deployer_run`
and `deployer_ar` IAM memberships deliberately. After any active rollout ends,
add and verify the resource-scoped grants, then remove the deployer's old
project-level Cloud Run Admin and Artifact Registry Writer memberships. Verify a
fresh deployment after propagation. Do not leave the broad grants as a permanent
fallback. Preserve other principals and the runtime service-account binding.

These are different resource types and remote IAM objects, not resource renames:
do not use `terraform state mv` or a `moved` block between the old and new types.
Use the authoritative backend/state and a reviewed migration plan. If the new
memberships were applied through the cloud API first, import them into their new
Terraform addresses; reconcile the removed old memberships by refresh/plan.
Do not run a blanket apply against an empty or stale state, and do not apply a
whole service update merely to change these IAM memberships.


## Observability, Vertex and spend guardrails (2026-10)

Files: `vertex.tf` (adopts what was created by hand on 2026-10-01),
`observability.tf` (metrics, alerts, extra uptime checks, log exclusion),
`dashboard.tf`, `budget.tf`.

**Nothing here has been planned or applied.** The configuration was only
checked with `terraform fmt -check`, `init -backend=false` and `validate`.
Agents never plan or apply: read the state-bucket warning in
[`HANDOFF.md`](../HANDOFF.md) first.

### Resources

| Group | Resources | Effect on first apply |
|-------|-----------|-----------------------|
| Adopted by `import` (no-op if the config matches live) | `google_project_service.vertex` x2 (aiplatform, apikeys); `google_service_account.vertex`; `google_project_iam_member.vertex_user`; `google_secret_manager_secret.vertex_api_key` and its `secretAccessor` binding; the existing `contact-phone` accessor binding | Plan should show them as `import` with no changes |
| Created | `google_logging_metric.app_event` x19 (one per contract-C event) and `.http_latency`; `google_monitoring_uptime_check_config.extra_hosts` x3; 13 `google_monitoring_alert_policy` (secondary hosts, 5xx ratio, p95 latency, container crash, instances at max, 7 event alerts, unexpected secret read); `google_monitoring_dashboard.portfolio`; `google_logging_project_exclusion.health_probe_ok`; `google_project_service.services["logging.googleapis.com"]` (already on, so a no-op enable) | Pure additions |
| Changed in place | `google_artifact_registry_repository.images` (adds `delete-old-images` and `keep-latest-tag`, keep count stays 10, dry-run on); `google_monitoring_uptime_check_config.health` (the live check probes `/api/health`, the config says `/api/health/ready`) | Review each diff |
| Do NOT apply | `google_cloud_run_v2_service.app`: the config adds the `VERTEX_API_KEY` secret env, but the deploy workflow already carries it forward (revision 00305 has it) and `terraform apply` of this resource is the hazard in HANDOFF.md. `lifecycle.ignore_changes` now covers `image`, `client` and `client_version`, but `GIT_COMMIT` (from `image_tag`) and traffic are still unmanaged | Exclude with `-target` lists below |
| Optional | `google_billing_budget.project` and `.vertex` plus `google_project_service.billing_budgets` | Only when `billing_account_id` is set |

Not managed on purpose: API keys (they would land in state), secret values,
domain mappings, legacy services, project-wide IAM on legacy identities.

### Estimated monthly cost

| Item | Estimate |
|------|----------|
| Log-based metrics (20), dashboard, budgets | No charge at this volume |
| Alert policies: 14 conditions | About $1.40 at $0.10 per condition (verify against the current Cloud Monitoring price list) |
| Uptime checks: 4 hosts, 300s, about 52k executions each per month | Inside the 1M free executions |
| Logs: about 4,000 requests a day plus app events | Inside the 50 GiB free allotment; the health-probe exclusion trims it further |
| Artifact Registry cleanup | Saves about $0.25 (57 images, 2.8 GB, to roughly 10 to 15 images) |
| **Net new Terraform-managed spend** | **About $1.50, up to $2** |

Vertex usage itself is not included. `min_instances` stays 0; moving to 1
costs about $9-11 a month and is the owner's call (audit GCP-07).

### Safe apply order (owner approves each step)

Run from a trusted operator checkout with `terraform init`; the plan reads the
shared state, so do not do this from CI or an agent session.

1. Plan only the additive pieces and read every line:

   ```bash
   cd infra
   terraform plan -out=tfplan -var "image_tag=<SHA currently serving>" \
     -target=google_project_service.vertex \
     -target=google_service_account.vertex \
     -target=google_project_iam_member.vertex_user \
     -target=google_secret_manager_secret.vertex_api_key \
     -target=google_secret_manager_secret_iam_member.vertex_api_key_run_access \
     -target=google_secret_manager_secret_iam_member.contact_phone_run_access
   terraform show -json tfplan | jq -r '.resource_changes[] | select(.change.actions != ["no-op"]) | "\(.change.actions | join(",")) \(.address)"'
   ```

   Expect only imports. Any `update` or `replace` means the live object differs
   from the config; stop and reconcile the config, not production.
2. Apply that plan, then repeat with the observability targets
   (`google_logging_metric.*`, `google_monitoring_*`, `google_logging_project_exclusion.*`).
   Metrics must exist before the alert policies that read them; a failed first
   alert apply is fixed by re-running it.
3. Artifact Registry: apply with `artifact_cleanup_dry_run=true` (the default),
   wait a day, search the audit log for what the policy would delete, confirm
   the serving and previous digests are absent from that list, then set
   `-var artifact_cleanup_dry_run=false`.
4. Budgets (optional): see "Budgets" below.
5. Never include `google_cloud_run_v2_service.app` in an apply. The require-no-change
   check from HANDOFF.md still holds.
6. Verify the notification email channel in the console (it shows unverified).
   Do not trigger a test alert from the CLI.

### Log contract the metrics assume

Every event is a JSON line on stdout with a top-level `event` and any labels
as top-level fields (`jsonPayload.limiter`, `.kind`, `.tool`, `.name`,
`.len_bucket`). If `backend/app/utils/events.py` nests fields differently, change
`label_extractors` in `observability.tf` to match. `portfolio_http_latency`
extracts `httpRequest.latency` from the request log; check in Logs Explorer
after the first apply that the metric receives data, and fall back to the
built-in `request_latencies` if not.

### Budgets and Vertex spend caps

A budget notifies; it never stops spend. Layers, cheapest to strongest:

1. **In-app**: `CHAT_DAILY_TOKEN_BUDGET` (per instance, resets on cold start).
2. **Quota caps**: Console, IAM & Admin, Quotas, filter service
   `aiplatform.googleapis.com`, and lower the per-minute generate-content
   request and token quotas for the two Gemini models in use. Suggested
   starting point, assuming the chat limits (10 messages a minute per
   connection, 30 per IP): about 60 requests a minute and 150k input tokens a
   minute per model, fallback model half of that. The exact metric names could
   not be read through the API during the audit, so confirm them in the console
   before writing `google_service_usage_consumer_quota_override` resources.
3. **Budget alerts**: `budget.tf`. Needs `billing.budgets.create` on the
   billing account. Either apply with
   `-var billing_account_id=<id> -var vertex_budget_service_ids='["services/..."]'`
   as a billing admin, or create two budgets in the console (Billing, Budgets
   & alerts): $15 for the project and $5 filtered to Vertex AI and Generative
   Language, thresholds 50/90/100% plus forecast, notifying the monitoring
   email channel. Look up catalog service ids with
   `curl -s -H "Authorization: Bearer $(gcloud auth print-access-token)" https://cloudbilling.googleapis.com/v1/services | jq '.services[] | select(.displayName|test("Vertex|Generative"))'`.
4. **Hard stop** (Pub/Sub to a function that disables the key version) is an
   owner decision and is not built.

### Vertex API key (not in Terraform)

Keys are bound to `portfolio-vertex` and restricted to
`aiplatform.googleapis.com`; an unbound key returns 401. Create and rotate by
hand so the string never reaches state or a terminal:

```bash
# create (bound and restricted), then store the value without printing it
gcloud beta services api-keys create --display-name=portfolio-chat-prod \
  --api-target=service=aiplatform.googleapis.com \
  --service-account=portfolio-vertex@portfolio-383615.iam.gserviceaccount.com
gcloud services api-keys get-key-string <KEY_ID> --format='value(keyString)' \
  | gcloud secrets versions add vertex-api-key --data-file=-
```

Rotate about every 90 days: new key, new secret version, start a new Deploy
workflow run (revisions read `latest` at start, so the running revision keeps
the old key), verify chat, then delete the old key and disable the old secret
version. The two old unbound Generative Language keys and the `svc-app-dev`
keys are owner decisions (audit GCP-05, GCP-06).

### IAM tightening the audit found

Terraform can only add controls here; the risky grants sit on identities it
does not manage. Compensating control shipped: the
`secret read by unexpected principal` alert fires when anything other than
`quickresume-run` reads a portfolio secret (needs the DATA_READ audit config in
`audit.tf`). Owner-run, after confirming the legacy apps are retired, and
never from an agent:

- remove project-wide `roles/secretmanager.secretAccessor` from the default
  compute service account and `svc-app-dev` (it can read `vertex-api-key`);
  if something still needs a secret, bind it per secret;
- delete the two user-managed `svc-app-dev` keys;
- drop `roles/editor` from the compute, appspot and cloudservices service
  accounts.

The WIF provider already requires `refs/heads/main`, the deploy workflow file,
the `production` environment and run attempt 1 (`github.tf`); the audit's
"no ref condition" referred to the live provider, so the first plan may show an
update there. Review it, because it tightens trust.

### CI

`ci.yml` caches Terraform providers and Playwright browsers, names the
shared-to-app boundary and undefined CSS token checks as separate steps (they
also run inside lint and test), refuses a Terraform-managed API key or
service-account key, and uploads Lighthouse and Playwright results. Lighthouse
byte budgets are errors; score and timing budgets in `e2e/lighthouserc.json`
are warnings until measured on the production image.

## Host canonicalization

`www.jckail.com`, `jckail.com`, `jordan-kail.com` and `www.jordan-kail.com` are
all mapped to the `quickresume` service and serve the same content, while the
canonical tags, sitemap and JSON-LD name `https://www.jckail.com` (audit I-9).
`backend/app/middleware/canonical_host.py` can 301 the alias hosts to the
canonical host. It is off by default and does nothing until `ALIAS_HOSTS` is set.

| Variable | Default | Meaning |
|---|---|---|
| `CANONICAL_HOST` | `www.jckail.com` | Redirect target. A bare hostname. |
| `ALIAS_HOSTS` | empty (off) | Comma list of hosts that redirect. Never include the canonical host. |

Rules: only `GET`/`HEAD` redirect, only when the `Host` header (port stripped,
case-insensitive) is listed. `/api/health*` and `/ws/` are never redirected, so
the `extra_uptime_hosts` checks in `observability.tf` keep probing each host
directly. `*.run.app`, tagged canary URLs, localhost and unknown hosts are never
listed, so they are never touched. `X-Forwarded-Host` is ignored. Invalid values
(scheme, path, port, IP, `*.run.app`, canonical inside the alias list) stop the
process at boot, so rehearse a value before applying it.

Enabling later (option A in `docs/host-canonicalization-decision.md`):

1. Safest, no Terraform apply: `gcloud run services update quickresume
   --region us-central1 --update-env-vars ALIAS_HOSTS=jordan-kail.com,www.jordan-kail.com`.
   This creates a new revision at 100% traffic; check it first with a tagged
   `--no-traffic` revision and `curl -sI -H 'Host: jordan-kail.com' <tagged-url>/`.
   Do not pass `--set-env-vars` (it would drop the other variables).
2. Persist it by adding `ALIAS_HOSTS` to `local.plain_env` in `infra/main.tf`.
   Read the "terraform apply reverts production" section of `HANDOFF.md` before
   any apply, or the next apply will drop a hand-set variable.
3. Verify with `curl -sI https://jordan-kail.com/anything?x=1`: expect `301` and
   `location: https://www.jckail.com/anything?x=1`. Roll back by clearing the
   variable (`--remove-env-vars ALIAS_HOSTS`).

Nothing in `deploy.yml` breaks: it verifies the tagged revision URL
(`*.run.app`) and the service URL at `/api/health`, neither is an alias host.
