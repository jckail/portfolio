# GCP Ops Runbook

Go-live is complete. This file is kept as the ops runbook (per the original
handoff's own follow-up item) rather than deleted, since the rollback and
operational notes below stay useful.

## Status (as of 2026-09-06)

- Production: **https://www.jckail.com** — Cloud Run service `quickresume`,
  project `portfolio-383615`, region `us-central1`.
- PR #3 (modernization) merged to `main`; Deploy workflow builds
  `helpers/Dockerfile.prod`, pushes `:${GITHUB_SHA}` and `:latest` to
  Artifact Registry, deploys **by digest** (not by tag) to a `--no-traffic`
  canary revision, verifies it, re-checks CI on current `main`, then promotes.
- Terraform manages Artifact Registry, Secret Manager, the runtime/deployer/
  planner service accounts, the Cloud Run v2 service, the WIF pool/provider,
  and uptime monitoring + alerting. Remote state lives in
  `gs://portfolio-383615-terraform-state`.
- All 5 runtime secrets (`supabase_url`, `supabase_anon_key`,
  `supabase_service_role`, `anthropic_api_key`, `sendgrid_api_key`) are in
  Secret Manager, mounted into Cloud Run via `secretKeyRef` — no plaintext
  secrets on the service or in git.
- Branch protection on `main` requires the 4 CI checks (Backend, Docker,
  Frontend, Terraform) before merge.
- **There is no `terraform-plan.yml` workflow.** It was removed as a security
  remediation (`29c45e5`): the "read-only" planner actually held
  `roles/storage.admin` on a bucket containing plaintext secrets. The
  `quickresume-planner` service account is disabled with no IAM. Only
  `ci.yml` and `deploy.yml` exist.
- Cloud Monitoring uptime check on **`/api/health/ready`** (5 min interval) +
  alert policy emailing `admin_email`. `/api/health` is liveness and returns
  200 with `"status": "degraded"` when the database is unreachable, so it is
  deliberately not the thing that alerts.
  **⚠ The notification channel has never been verified** — it reports
  `enabled: true` with `verificationStatus` unset, which means it silently
  delivers nothing. Alerting is a no-op until someone completes the
  `:sendVerificationCode` / `:verify` flow. See `docs/audit-2026-09-06.md` §3 O2.

## Known operational gotcha: image tag drift

`infra/terraform.tfvars` pins `image_tag = "latest"`, but the Deploy
workflow deploys Cloud Run directly with the commit-SHA tag via `gcloud run
deploy`, bypassing Terraform entirely. Both the SHA tag and `:latest` are
pushed together in the same build step, so they normally point at the same
digest — **except** right after someone builds/pushes an image out-of-band
(as happens during initial bring-up). If `:latest` and the currently-running
SHA ever diverge, a plain `terraform apply` will silently roll the live
service back to whatever `:latest` currently points to.

Mitigation: before running `terraform apply` for anything touching
`google_cloud_run_v2_service.app`, diff the plan first. If it proposes to
change `containers[0].image` or the `GIT_COMMIT` env var, stop and either
target around that resource (`-target=...` excluding the service) or update
`image_tag` to match the currently-deployed SHA before applying.

## Rollback

```bash
gcloud run revisions list --service quickresume --region us-central1
gcloud run services update-traffic quickresume --region us-central1 \
  --to-revisions <PREVIOUS_REVISION>=100
```

Instant; prior images stay in Artifact Registry (cleanup keeps 10).

## Remaining follow-ups

None outstanding from the original go-live plan. Open items to consider
separately:

- Dependabot flagged vulnerabilities on `main` (`gh api
  repos/jckail/portfolio/dependabot/alerts`) — not part of this go-live,
  worth a dedicated pass.
- `enforce_admins` is currently `false` on the `main` branch protection rule
  (repo owner can bypass required checks). Flip to `true` in
  `gh api repos/jckail/portfolio/branches/main/protection` if that's not
  wanted.


## Known operational hazards

Confirmed against live infrastructure on 2026-09-06. Full detail and exact
remediations in [`docs/audit-2026-09-06.md`](docs/audit-2026-09-06.md).

### `terraform apply` will revert production

Terraform state is from 2026-07-09 (serial 9). The config has no `traffic`
block and `image_tag` defaults to `"latest"`, while the deploy workflow ships
a **digest** and pins traffic to a named revision. An apply today would:

- replace the digest-pinned image with the mutable `:latest` tag,
- reset traffic from the verified revision to `LATEST` 100%,
- set `GIT_COMMIT` to the literal string `"latest"`.

Because `:latest` is currently pushed *before* the canary is verified, an apply
after a failed deploy would ship the exact image that failed verification.

**Before any apply**, review the plan explicitly:

```bash
cd infra
terraform plan -out=tfplan -var "image_tag=<currently deployed SHA>"
terraform show -json tfplan | jq -r '
  .resource_changes[] | select(.change.actions != ["no-op"])
  | "\(.change.actions | join(",")) \(.address)"'
```

Require **no** change to `google_cloud_run_v2_service.app` and **no**
delete/replace on `google_secret_manager_secret_version.*`.

### The state bucket is unprotected

`gs://portfolio-383615-terraform-state` has no explicit IAM — access is
inherited from project basic roles, so **anyone with `roles/viewer` can read
the state**, which contains all five secrets in plaintext including
`SUPABASE_SERVICE_ROLE` (bypasses RLS). None has been rotated since
2026-07-09. This is the highest-severity open item.

### `helpers/deploy.sh` is not a safe fallback

It uses `--set-env-vars`, which is authoritative: one run **replaces the
Secret Manager `secretKeyRef` bindings with plaintext credentials** on the
revision spec, visible to anyone with `roles/run.viewer`. It also routes 100%
of traffic immediately, with no canary, digest binding or CI gate. Use the
Deploy workflow; for a genuine emergency, deploy a digest with `--no-traffic`
and promote only after verifying the tagged URL.

### Rollback

```bash
gcloud run services update-traffic quickresume \
  --project portfolio-383615 --region us-central1 \
  --to-revisions=<PREVIOUS_REVISION>=100 --quiet
```

Note the deploy workflow does **not** roll back automatically on a failed
post-promotion check, and that check currently probes liveness rather than
readiness with no retry.
