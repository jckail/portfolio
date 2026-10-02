# Hosted labs and forwards

A portfolio project can be reachable at `https://www.jckail.com/<slug>` in one of two ways. This page describes how
the platform works. The step-by-step recipe for adding one is [`apps.md`](./apps.md), and each shipped lab has a
design note in [`apps/`](./apps/) (`aibilling`, `cryptotrader`, `gopilot`, `jobbr`).

| Kind | `/<slug>` does | Data file |
|---|---|---|
| Hosted lab | HTTP 200: an interactive demo that runs in the visitor's browser on synthetic data | `backend/app/data/labs/<slug>.json` |
| Forward | HTTP 302 to the app's own domain | one entry in `backend/app/data/forwards.json` |

`/dataplayground` is a separate, older feature and is not part of this platform; its slug is reserved.

## Pieces

| Piece | Path | Role |
|---|---|---|
| Models and slug rules | `backend/app/models/labs.py` | `Lab`, `Forward`, `SLUG_PATTERN` (`^[a-z][a-z0-9]{2,30}$`), `RESERVED_SLUGS`, https-only URL checks, length caps, "synthetic" and "browser" required in `demo_notice` |
| Catalog loader | `backend/app/labs.py` | `load_catalog()` (cached) validates every file; file name must equal slug, slugs unique across labs and forwards, `project_key` must exist in `projects.json`. A violation raises `LabDataError`, so startup and CI fail instead of serving a broken route |
| Routes | `backend/app/api/labs_routes.py` | `GET /api/labs`, `GET /api/labs/{slug}` (pre-rendered bytes, ETag and gzip via `api/content.py`), plus one root-level 302 route per forward (`/<slug>` and `/<slug>/`, GET and HEAD) |
| Server-rendered document | `backend/app/labs_document.py`, `backend/app/spa.py` | `spa.py` answers 200 for a hosted slug and injects title, description, canonical, Open Graph, JSON-LD (`WebApplication`, `BreadcrumbList`) and an escaped intro, feature list, notice and repo link into `#root`; React replaces it on mount |
| Discovery | `backend/app/api/discovery.py` | `sitemap.xml` has one entry per hosted lab (`updated` is `lastmod`); `llms.txt` and `llms-full.txt` have an "Interactive demos" section listing hosted labs (canonical URL) and forwards (their own URL) |
| SPA routing | `frontend/src/main.tsx`, `frontend/src/app/labs/lab-path.ts` | `labSlugFromPath` maps `/<slug>` to the lazy `LabHost`; its reserved list mirrors the backend's |
| Lab host | `frontend/src/app/labs/lab-host.tsx`, `lab-shell.tsx`, `lab-not-found.tsx` | `import.meta.glob('./*/lab.tsx')` finds the lab by folder name and loads it lazily inside `LabShell` (record fetched from `/api/labs/<slug>`, endpoint in `shared/utils/api/endpoints.ts`) |
| Lab UI | `frontend/src/app/labs/<slug>/lab.tsx` | Default-exported component with no props; owns its `<h1>`; self-contained |
| Tests | `backend/tests/test_labs.py`, `frontend/src/app/labs/**/*.test.ts(x)`, `e2e/tests/labs.spec.ts` | See below |

## Request behavior

- Hosted slug: 200, the document above, and a `Link: <canonical>; rel="canonical"` header.
- Forward slug: 302, `Location` from the data only, `X-Robots-Tag: noindex`, `Cache-Control: public, max-age=300`.
  Forwards are not in `sitemap.xml`.
- A slug in neither list: 404 with the site's Not Found view.
- A hosted slug with data but no `frontend/src/app/labs/<slug>/lab.tsx` in the build: the server answers 200 and the
  SPA shows "This demo is not available in this build yet." `test_labs.py` fails CI for that state on real data.
- Forward routes are declared per slug when `api/__init__.py` extends `api_router`, so they win over the SPA
  fallback mounted at `/`.

## Rules to keep

- Lab data is content: it lives in JSON, not in TSX, and a field change updates `models/labs.py` in the same change.
  Loaders are cached; restart the process to see edits.
- Every lab is honest: synthetic data only, runs in the browser (the notice must say so). Per-lab specifics
  are in `docs/apps/<slug>.md`.
- Reserved slugs are changed in both `models/labs.py` and `lab-path.ts`.
- Do not change a forwarded app's Cloud Run service or domain mapping from this repo.

## Tests

- `backend/tests/test_labs.py`: slug and reserved-name rules, field validation, catalog rules, real data validity
  (every hosted slug has a frontend folder), list and get routes, forward status and headers, sitemap and llms
  output, document rendering and escaping, and that a forward answers before the SPA fallback.
- Vitest next to each lab (`lab.test.tsx`, `logic.test.ts`) and for the host (`lab-host.test.tsx`, `lab-path.test.ts`).
- `e2e/tests/labs.spec.ts` against the built image: forwards answer 302 with the expected target and noindex,
  forwards are absent from the sitemap and present in `llms.txt`, an unknown slug shows Not Found, and each hosted
  lab has one `main`, one `h1` and no horizontal overflow at phone width.
