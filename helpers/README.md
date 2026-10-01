# Helpers 🛠️

Build, run, and deployment tooling for the portfolio app.

> **Do not run `deploy.sh`.** It replaces Secret Manager bindings with
> plaintext env vars and skips the zero-traffic canary (`../HANDOFF.md`).
> Production ships only through the GitHub Actions `Deploy` workflow.

| File | Purpose |
|------|---------|
| `deploy.sh` | UNSAFE, kept for reference: manual build, push and deploy. Do not run it |
| `e2e-docker.sh` | Run the Playwright suite in the pinned Playwright container against a server you started |
| `local_test.sh` | Full local run: builds the frontend, starts the backend on `:8080` and the Vite dev server on `:5173` |
| `kill_hanging.sh` | Kill leftover dev-server processes |
| `docker-compose.yml` | Containerized local run using `Dockerfile.dev` |
| `Dockerfile.prod` | Multi-stage production image (Node 22 frontend build → Python 3.12 runtime) |
| `Dockerfile.dev` | Same as prod but with `--reload` and dev config |
| `test_email.py` | Post-deploy smoke test for the SendGrid contact endpoint |
| `build_resume_pdf.py` | Regenerate the ATS-first resume (`JordanKailResume.pdf`, `.txt`, `.meta.json`) from `backend/app/data/*.json` |
| `verify_deployment.py` | Deploy authorization gate — re-checks CI on current `main` before promoting traffic |
| `compile-requirements.sh` | Regenerate the hash-pinned `requirements.lock.txt` |
| `assets/fonts/` | Fonts the resume generator embeds |

## Deploying

The only deploy path is the GitHub Actions `Deploy` workflow, which ships every
push to `main` as a zero-traffic revision, verifies it, then promotes it (setup
in [`../DEPLOYMENT.md`](../DEPLOYMENT.md)). `deploy.sh` is not a fallback; see
the warning at the top.

> For managing the underlying infrastructure (APIs, registry, secrets, IAM,
> the Cloud Run service itself) with Terraform, see [`../infra/`](../infra/README.md)
> and read `../HANDOFF.md` first.

## Local development

```bash
./helpers/local_test.sh
# Frontend: http://localhost:5173  (hot reload; proxies /api and /ws)
# Backend:  http://localhost:8080  (serves the built frontend + API docs at /docs)
```

Browser tests in a container (needs Docker; run `npm ci` in `e2e/` once). The
script pins the Playwright image to the version in `e2e/package-lock.json` and
maps `localhost` to the host, so the page stays on `localhost` (the CSP upgrades
other http hosts to https):

```bash
E2E_BASE_URL=http://localhost:8080 ./helpers/e2e-docker.sh
E2E_BASE_URL=http://localhost:9130 ./helpers/e2e-docker.sh tests/smoke.spec.ts
```

Start the backend with empty `VERTEX_API_KEY` and `ANTHROPIC_API_KEY` if you do
not want any real model call.

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


## Regenerating the resume

`build_resume_pdf.py` derives the PDF, a plain-text copy and a manifest from
`backend/app/data/*.json`, so a role or skill change is a data edit followed by
one regeneration, and the diff is reviewable. The layout is single column,
selectable text, plain headings (Summary, Experience, Skills, Projects), and no
phone number. No education section is written because the data has none.

```bash
uv run --no-project --with reportlab --with pypdf python helpers/build_resume_pdf.py
```

reportlab and pypdf are not runtime dependencies. The script prints warnings if
content would overflow the page. `backend/tests/test_resume_pdf.py` and
`test_data.py` compare the artifacts with the data, so a forgotten
regeneration fails the suite. **Regenerate; never hand-edit the PDF, text or
manifest.**
