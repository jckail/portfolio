![Portfolio Banner](readMeBanner.png)

# Portfolio

The source for [jckail.com](https://www.jckail.com): Jordan Kail's interactive
resume site, a React SPA and a FastAPI API served from one Cloud Run service,
with an AI assistant that answers questions from the published portfolio data.

**Status:** active; `main` deploys to production through GitHub Actions.

## What it does

- Renders experience, skills and projects from JSON in
  [`backend/app/data/`](./backend/app/data), with deep-linkable sections and
  modals (`?project=`, `?skill=`, `?company=`).
- Generates an ATS-friendly PDF resume and machine-readable surfaces
  (`/llms.txt`, `/resume.json`, `/sitemap.xml`, JSON-LD, a crawler HTML
  snapshot) from that same data.
- Streams an AI assistant over WebSocket (Vertex AI Gemini by default,
  Anthropic Claude as the alternative). It can search the portfolio and drive
  the page; anything that sends mail, books a meeting or reveals contact
  details runs only after the visitor reviews and confirms a card.
- Hosts browser-only demos of other projects at `/<slug>` and forwards other
  slugs to their own domains.
- Ships through CI-gated, keyless, verify-before-promote deploys, with
  infrastructure described in Terraform.

The full feature list, stack and architecture diagram are in
[docs/overview.md](./docs/overview.md).

## Quickstart

Prerequisites: Node.js 22+ with npm, Python 3.12+, and a `.env` file at the
repo root (variables are listed in
[backend/README.md](./backend/README.md#environment-variables)).

```bash
git clone https://github.com/jckail/portfolio.git
cd portfolio

pip install -r requirements-dev.txt   # prod deps + pytest, ruff
(cd frontend && npm install)

./helpers/local_test.sh
```

- Frontend (hot reload): http://localhost:5173
- Backend API + built frontend: http://localhost:8080
- API documentation: http://localhost:8080/docs

## Layout

| Path | Contents |
|---|---|
| [`frontend/`](./frontend) | React 18 + TypeScript + Vite SPA |
| [`backend/`](./backend) | FastAPI app, portfolio JSON, prompts, generated resume, pytest suite |
| [`copilot/`](./copilot) | Node agent subprocess the backend starts per turn for the [Data Playground](./docs/dataplayground.md) copilot ([README](./copilot/README.md)) |
| [`e2e/`](./e2e) | Playwright smoke tests run against the built image |
| [`infra/`](./infra) | Terraform for GCP (Cloud Run, secrets, registry, Workload Identity Federation) |
| [`helpers/`](./helpers) | Dockerfiles, local run script, e2e-in-Docker, resume generator, deploy verification |
| [`docs/`](./docs) | ADRs, runbooks, audits and design notes ([index](./docs/README.md)) |
| [`.github/workflows/`](./.github/workflows) | `ci.yml` (required checks) and `deploy.yml` |

## Documentation

- [Docs index](./docs/README.md) — every document under `docs/`, grouped
- [Feature and stack overview](./docs/overview.md) — full feature list, stack, architecture diagram
- [Frontend](./frontend/README.md) and [backend](./backend/README.md) — technical docs, API reference, environment variables
- [Assistant runtime](./docs/portfolio-assistant-runtime.md) — access gating, tools, calendar, acceptance
- [Hosted apps and forwards](./docs/apps.md) and [labs platform](./docs/labs.md); [Data Playground](./docs/dataplayground.md)
- [Architecture decisions](./docs/adr/README.md) — ADRs 0001-0007
- [Deployment checklist](./DEPLOYMENT.md), [GCP hosting and release runbook](./docs/gcp-project-hosting.md), [infrastructure](./infra/README.md), [helpers](./helpers/README.md)
- [HANDOFF.md](./HANDOFF.md) — operations runbook and production hazards
- [Security review](./docs/security-review-2026-09-05.md), [audit](./docs/audit-2026-09-06.md) and [open findings](./docs/audit-2026-09-06-open-findings.md)
- [ROADMAP.md](./ROADMAP.md), [CHANGELOG.md](./CHANGELOG.md)
- [AGENTS.md](./AGENTS.md) / [CLAUDE.md](./CLAUDE.md) — conventions and non-negotiables for coding agents (and a good map for humans)
- API reference: `/docs` on a running backend

## Development

```bash
# Backend, from the repo root
python -m ruff check backend
python -m pytest backend/tests

# Frontend
cd frontend
npm run lint && npm run type-check && npm test

# Browser tests in a container, against a server you already started
E2E_BASE_URL=http://localhost:8080 ./helpers/e2e-docker.sh
```

Backend tests run offline with dummy credentials. Write tests for new
behaviour and update the docs alongside the change.

## Deployment

Merges to `main` deploy automatically to Cloud Run once the one-time setup in
[DEPLOYMENT.md](./DEPLOYMENT.md) is complete. Do not deploy from a laptop:
`helpers/deploy.sh` is kept for reference only and is unsafe (see
[helpers/README.md](./helpers/README.md) and [HANDOFF.md](./HANDOFF.md)).
