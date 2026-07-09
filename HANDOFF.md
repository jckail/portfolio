# GCP Go-Live Runbook (for an agent with `gcloud` access)

Mission: take the modernization branch live. Configure GCP + GitHub so that
merging PR #3 deploys to Cloud Run automatically, then merge, verify, and
leave the pipeline healthy. `DEPLOYMENT.md` is the owner-facing summary;
this file is the step-by-step runbook with exact commands and safety gates.

## Current state (verified 2026-07-09)

- PR #3 (`cursor/modernize-app-haiku-4-5-52b1` → `main`) is **draft**, all 4
  CI checks green, `MERGEABLE`/`CLEAN`, 37 commits ahead of main, 0 behind.
- `.github/workflows/deploy.yml` runs on push to `main` but **skips itself
  while the `GCP_PROJECT_ID` repo variable is unset** — so merging before GCP
  is configured is safe, it just won't deploy.
- Terraform in `infra/` manages: Artifact Registry, Secret Manager, runtime
  service account, Cloud Run v2 service, and (when `github_repository` is
  set) a WIF pool/provider + deployer service account.
- Production today: `https://www.jckail.com` — assume an existing GCP
  project (Terraform default: `portfolio-383615`) with a running service
  that this Terraform does NOT yet know about. Discovery + import below.

## Inputs the human must provide (do not proceed without them)

1. GCP project id (confirm `portfolio-383615` or the real one) and billing
   enabled; `gcloud` authenticated as an owner/editor of that project.
2. The five secret values (never echo, never commit):
   `supabase_url`, `supabase_anon_key`, `supabase_service_role`,
   `anthropic_api_key`, `sendgrid_api_key`.
3. `admin_email` for the admin panel.
4. `gh` CLI authenticated with **admin** on `jckail/portfolio` (needed for
   `gh secret set` / `gh variable set` / merging).

## Ground rules

- Never print secret values to the terminal or logs; write
  `infra/terraform.tfvars` (git-ignored) with an editor or heredoc and keep
  it out of commits (`git status` must stay clean of it).
- STOP and reconcile (import, don't recreate) if `terraform plan` proposes
  to **destroy or replace** `google_cloud_run_v2_service.app` or any
  `google_secret_manager_secret.*` that exists in prod.
- Custom domain mappings (www.jckail.com) are NOT managed by this Terraform.
  Do not touch them; only verify they still resolve after deploy.
- Prefer `--format=json` gcloud output for parsing; keep region consistent
  (`us-central1` unless discovery says otherwise).

## Phase 0 — Preflight and discovery (read-only)

```bash
gcloud auth list
gcloud config get-value project        # set with: gcloud config set project <ID>
gh auth status
terraform -version                     # >= 1.5

# What already exists?
gcloud run services list --format='table(metadata.name,status.url,status.latestReadyRevisionName)'
gcloud artifacts repositories list --format='table(name,format)'
gcloud secrets list --format='table(name)'
gcloud iam service-accounts list --format='table(email)'
gcloud iam workload-identity-pools list --location=global --format='table(name)'
gcloud beta run domain-mappings list --region us-central1 || true
```

Record: existing service name + region, existing AR repos, existing secrets,
existing domain mappings. Decide the canonical names — Terraform defaults
are service `quickresume`, repo `portfolio`, region `us-central1`. If the
live service uses different names, either set matching values in
`terraform.tfvars` (preferred: adopt what exists) or plan a cutover.

## Phase 1 — Remote Terraform state (do this BEFORE first apply)

```bash
PROJECT_ID=$(gcloud config get-value project)
gcloud storage buckets create "gs://${PROJECT_ID}-terraform-state" \
  --location=us-central1 --uniform-bucket-level-access
gcloud storage buckets update "gs://${PROJECT_ID}-terraform-state" --versioning
```

Uncomment the `backend "gcs"` block in `infra/versions.tf`, set
`bucket = "${PROJECT_ID}-terraform-state"`, keep `prefix = "portfolio"`.
Commit that edit (it contains no secrets). Then `cd infra && terraform init`.

## Phase 2 — terraform.tfvars

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # git-ignored; verify with: git check-ignore terraform.tfvars
```

Fill in: `project_id`, `region`, `service_name`, `artifact_repository`
(from Phase 0 decisions), `github_repository = "jckail/portfolio"`,
`admin_email`, `allowed_origins = "https://www.jckail.com"`,
`production_url = "https://www.jckail.com"`, and the five `secrets` values.

## Phase 3 — Import anything that already exists

Only import resources discovery found; skip the rest. Substitute
`$PROJECT_ID`, region, and names as discovered:

```bash
# Cloud Run service (CRITICAL — never let TF recreate the live service)
terraform import google_cloud_run_v2_service.app \
  projects/$PROJECT_ID/locations/us-central1/services/quickresume

# Artifact Registry repo
terraform import google_artifact_registry_repository.images \
  projects/$PROJECT_ID/locations/us-central1/repositories/portfolio

# Runtime service account (account id: quickresume-run)
terraform import google_service_account.run \
  projects/$PROJECT_ID/serviceAccounts/quickresume-run@$PROJECT_ID.iam.gserviceaccount.com

# Secrets (TF secret_ids use hyphens)
for s in supabase_url supabase_anon_key supabase_service_role anthropic_api_key sendgrid_api_key; do
  hyphen=${s//_/-}
  terraform import "google_secret_manager_secret.secrets[\"$s\"]" \
    "projects/$PROJECT_ID/secrets/$hyphen" || true
done

# WIF pool/provider + deployer SA (only if they pre-exist)
terraform import 'google_iam_workload_identity_pool.github[0]' \
  projects/$PROJECT_ID/locations/global/workloadIdentityPools/github-actions || true
terraform import 'google_iam_workload_identity_pool_provider.github[0]' \
  projects/$PROJECT_ID/locations/global/workloadIdentityPools/github-actions/providers/github-oidc || true
```

## Phase 4 — Plan, gate, apply

```bash
terraform plan -out=tfplan
```

Review the plan. Acceptable: creates for missing resources, in-place updates
on the service (env vars, probes, scaling). **Not acceptable without human
sign-off: destroy/replace of the Cloud Run service or any secret.**

Fresh-project chicken-and-egg: the service references
`us-central1-docker.pkg.dev/$PROJECT_ID/portfolio/quickresume:latest`. If
that tag doesn't exist yet, stage the apply:

```bash
terraform apply -target=google_artifact_registry_repository.images \
                -target=google_secret_manager_secret_version.secret_versions
gcloud auth configure-docker us-central1-docker.pkg.dev --quiet
docker build -f ../helpers/Dockerfile.prod -t \
  us-central1-docker.pkg.dev/$PROJECT_ID/portfolio/quickresume:latest ..
docker push us-central1-docker.pkg.dev/$PROJECT_ID/portfolio/quickresume:latest
terraform apply    # full apply now succeeds
```

Otherwise just `terraform apply tfplan`.

## Phase 5 — Wire GitHub Actions

```bash
cd infra
gh secret set GCP_WORKLOAD_IDENTITY_PROVIDER \
  --repo jckail/portfolio --body "$(terraform output -raw workload_identity_provider)"
gh secret set GCP_DEPLOYER_SERVICE_ACCOUNT \
  --repo jckail/portfolio --body "$(terraform output -raw deployer_service_account)"

gh variable set GCP_PROJECT_ID     --repo jckail/portfolio --body "$PROJECT_ID"
# Only if different from the workflow defaults (us-central1 / quickresume / portfolio):
# gh variable set GCP_REGION         --repo jckail/portfolio --body "us-central1"
# gh variable set CLOUD_RUN_SERVICE  --repo jckail/portfolio --body "quickresume"
# gh variable set AR_REPOSITORY      --repo jckail/portfolio --body "portfolio"
```

## Phase 6 — Land PR #3 and watch the deploy

```bash
gh pr ready 3 --repo jckail/portfolio
gh pr merge 3 --repo jckail/portfolio --merge   # merge commit preserves the 37 logical commits
gh run watch --repo jckail/portfolio            # or: gh run list --workflow Deploy
```

The Deploy workflow: builds `helpers/Dockerfile.prod`, pushes SHA + latest
tags, `gcloud run deploy`, then polls `/api/health` (12×5s) and fails the
run if it never returns 200.

## Phase 7 — Live verification

```bash
URL=$(gcloud run services describe quickresume --region us-central1 --format='value(status.url)')
curl -fsS "$URL/api/health"
curl -fsS "$URL/api/chat/status"        # {"available": true} proves the Anthropic key flowed through
curl -sI  "$URL/" | grep -iE 'content-security-policy|x-request-id|strict-transport'
curl -fsS "https://www.jckail.com/api/health"   # custom domain still mapped
```

Browser checks (report results, screenshots if possible):
- Chat: ask "show me his resume" → expect prose + the resume section opening
  (proves live tool-calling, untestable without real keys).
- Ask the assistant to "help me draft an email to Jordan" → contact modal
  opens prefilled.
- `Ctrl/Cmd+K` palette, `?project=super_teacher` deep link, party mode via
  Konami or `?party=1`.
- DevTools console: no CSP violations (fonts, GA, WebSocket). If CSP blocks
  something, fix the allowlist in `backend/app/main.py`
  (`Content-Security-Policy` header), commit to main, let it redeploy.

## Rollback

```bash
gcloud run revisions list --service quickresume --region us-central1
gcloud run services update-traffic quickresume --region us-central1 \
  --to-revisions <PREVIOUS_REVISION>=100
```

Instant; prior images stay in Artifact Registry (cleanup keeps 10).

## Follow-ups to leave in place (roadmap P0/P1)

1. CI `terraform plan` on PRs touching `infra/` (remote state now exists;
   needs a read-only WIF binding).
2. Cloud Monitoring uptime check on `/api/health` + alert channel, in
   Terraform.
3. Branch protection on `main` requiring the four CI checks.
4. Delete this file once executed, or check off items and keep it as the
   ops runbook.
