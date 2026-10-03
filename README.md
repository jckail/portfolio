# Jordan Kail — Portfolio

Source for [jckail.com](https://www.jckail.com): a React/Vite portfolio served by FastAPI, with streaming chat and synthetic interactive demos.

## Start here

- [Architecture and data flow](docs/architecture.mdx)
- [Development and verification](docs/developer.mdx)
- [Current engineering instructions](AGENTS.md) and [operational handoff](HANDOFF.md)

## What lives here

| Area | Responsibility |
| --- | --- |
| `frontend/src/app/` | Portfolio sections, chat, admin dialog, hosted labs and Data Playground |
| `frontend/src/shared/` | API client, navigation, consent, reusable controls and UI stores |
| `backend/app/` | Content APIs, WebSocket chat, contact/admin routes and bounded lab adapters |
| `backend/app/data/` | Validated portfolio content and generated synthetic demo catalogs |
| `copilot/` | Optional Data Playground agent subprocess integration |
| `helpers/`, `infra/`, `e2e/` | Release verification, infrastructure and browser checks |

The home page uses section anchors; `/admin` opens its login dialog. Hosted labs live at `/<slug>`, while configured forwards redirect to an app's own domain. `/dataplayground` has a separate lazy entry. See [labs](docs/labs.md) and [Data Playground](docs/dataplayground.md) for their boundaries.

## Develop

Use Node.js 22 for the frontend and Python 3.12 for the backend; the optional Copilot uses Node.js 24 in CI. Follow the [developer guide](docs/developer.mdx) for environment requirements, server reuse and checks.

From `frontend/`, the existing scripts are `npm run dev`, `npm run lint`, `npm run type-check`, `npm test`, `npm run test:coverage` and `npm run build`. Dependency installation and broad checks in the shared workspace require the verification owner and heavy-check wrapper.

`helpers/local_test.sh` kills processes through `kill_hanging.sh`, deletes `frontend/dist`, builds and starts servers. Use the separately owned server workflow in the guide instead of running this helper by default.

## Release

[Deploy](.github/workflows/deploy.yml) scans the image, requires successful current-main CI, deploys an immutable digest with no traffic, verifies the tagged revision, rechecks CI and then promotes it. Read [DEPLOYMENT.md](DEPLOYMENT.md), [HANDOFF.md](HANDOFF.md) and [infrastructure notes](infra/README.md) before release work. `helpers/deploy.sh` is not the release path.

## Further documentation

- [Frontend](frontend/README.md) and [backend](backend/README.md) reference guides
- [Deployment tooling](helpers/README.md) and [architecture decisions](docs/adr/README.md)
- [Adding apps](docs/apps.md), [data operations](docs/data-operations-design.md) and [hosting](docs/gcp-project-hosting.md)
- [Open findings](docs/audit-2026-09-06-open-findings.md), [audit](docs/audit-2026-09-06.md) and [roadmap](ROADMAP.md)
- [Chat provider decision](docs/adr/0005-vertex-provider-service-account-bound-key.md), [visitor confirmation](docs/adr/0006-execute-tools-need-visitor-confirmation.md) and [content truthfulness](docs/adr/0007-content-truthfulness-guard.md)

These guides describe the source; runtime, provider connectivity and deployment require their own verification. Historical decisions and operational notes remain available rather than being replaced by this overview.

## Connect

[GitHub](https://github.com/jckail) · [LinkedIn](https://www.linkedin.com/in/jckail/)
