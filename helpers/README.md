# Helpers 🛠️

Build, run, and deployment tooling for the portfolio app.

| File | Purpose |
|------|---------|
| `deploy.sh` | Build the Docker image, push to Artifact Registry, deploy to Cloud Run, and health-check the result |
| `local_test.sh` | Full local run: builds the frontend, starts the backend on `:8080` and the Vite dev server on `:5173` |
| `kill_hanging.sh` | Kill leftover dev-server processes |
| `docker-compose.yml` | Containerized local run using `Dockerfile.dev` |
| `Dockerfile.prod` | Multi-stage production image (Node 22 frontend build → Python 3.12 runtime) |
| `Dockerfile.dev` | Same as prod but with `--reload` and dev config |
| `test_email.py` | Post-deploy smoke test for the SendGrid contact endpoint |

## Deploying

The primary deploy path is the GitHub Actions `Deploy` workflow, which
ships every push to `main` automatically (setup in
[`../DEPLOYMENT.md`](../DEPLOYMENT.md)). `deploy.sh` is the manual fallback:

```bash
# Requires: docker, gcloud (authenticated), jq, and a filled-in .env at the repo root
./helpers/deploy.sh            # production deploy (default)
./helpers/deploy.sh --dev      # local dev image build only
```

The script is configured via environment variables (all have sensible
defaults): `GCP_PROJECT_ID`, `GCP_REGION`, `SERVICE_NAME`, `AR_REPOSITORY`,
plus optional `CLOUD_RUN_MEMORY`, `CLOUD_RUN_CPU`, `CLOUD_RUN_MIN_INSTANCES`,
and `CLOUD_RUN_MAX_INSTANCES`.

Images are tagged with the current git commit and pushed to **Artifact
Registry** (`{region}-docker.pkg.dev/{project}/{repo}/{service}:{sha}`).

> For managing the underlying infrastructure (APIs, registry, secrets, IAM,
> the Cloud Run service itself) with Terraform, see [`../infra/`](../infra/README.md).

## Local development

```bash
./helpers/local_test.sh
# Frontend: http://localhost:5173  (hot reload; proxies /api and /ws)
# Backend:  http://localhost:8080  (serves the built frontend + API docs at /docs)
```

Or containerized:

```bash
docker compose -f helpers/docker-compose.yml up --build
```

Both paths require a `.env` file at the repository root — see
[backend/README.md](../backend/README.md) for the variable list.


## Automated revision tag cleanup

After successful production health verification, `cleanup_revision_tags.py`
removes only exact `gh-<7 lowercase hex>` tags on other zero-traffic revisions.
It preserves the current release tag, all tags pointing to the current revision,
custom tags, and every revision. It requires a ready service with100% traffic on
the verified revision, rechecks the inventory before removal, and reads back tags
and traffic afterward. It uses only scoped `--remove-tags`, never traffic-target
flags or revision deletion. CI runs its standard-library mocked command tests.

Cleanup failure fails the workflow after deployment; it does not roll back a
healthy release. On workflow failure, a separate `--failed-canary` mode runs only
when both TAG and REVISION were recorded. It removes only that exact automated
tag if it still maps to that revision and the revision has zero aggregate
production traffic. It preserves all other tags, including custom aliases of the
failed revision. A tag reassignment is rejected; a traffic-bearing revision is
a safe no-op, preserving the primary failure after promotion.
Canceled jobs and deployment failures before REVISION is recorded are not cleaned
automatically; their tag/revision identity must be verified by an operator or
cleaned after the next successful release. An unready service also fails closed.

The read/check/update sequence is not atomic with other administrators. The
workflow concurrency group prevents overlapping runs of this workflow, but an
external tag reassignment between check and removal can race cleanup. Keep
external traffic/tag changes serialized with deployment; investigate readback
mismatches without automatic retries. Removing tags closes tagged URLs, not every
possible revision access path, and does not revoke credentials or delete images.
