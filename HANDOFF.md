# GCP Ops Runbook

Go-live is complete. This file is kept as the ops runbook (per the original
handoff's own follow-up item) rather than deleted, since the rollback and
operational notes below stay useful.

## Status (as of 2026-07-09)

- Production: **https://www.jckail.com** — Cloud Run service `quickresume`,
  project `portfolio-383615`, region `us-central1`.
- PR #3 (modernization) merged to `main`; Deploy workflow builds
  `helpers/Dockerfile.prod`, pushes `:${GITHUB_SHA}` and `:latest` to
  Artifact Registry, deploys the SHA tag, and health-checks `/api/health`.
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
- CI runs a read-only `terraform plan` on PRs touching `infra/**`
  (`.github/workflows/terraform-plan.yml`), using a `quickresume-planner`
  service account scoped to `roles/viewer` + the state bucket only — it
  cannot modify any deployed resource.
- Cloud Monitoring uptime check on `/api/health` (5 min interval) + alert
  policy emailing `admin_email` when it's been failing for 5+ minutes.

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
