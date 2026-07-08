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
