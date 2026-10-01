<!-- Keep AGENTS.md and CLAUDE.md identical. Claude Code reads CLAUDE.md; Cursor, Codex, and Kimi read AGENTS.md. -->

# Portfolio — agent instructions

You are working on Jordan Kail's public site, [jckail.com](https://www.jckail.com) (`github.com/jckail/portfolio`). It is one Cloud Run service (`quickresume`, GCP project `portfolio-383615`, `us-central1`) that serves a React SPA and a FastAPI API from the same origin.

This is not FlightLog Blackbox and not Encore. Do not apply those repos' invariants, progress boards, or specs here.

## What to trust

When documents disagree, use this order:

1. Current source and the tests that lock it.
2. This file.
3. `HANDOFF.md` and `docs/audit-2026-09-06.md` / `docs/audit-2026-09-06-open-findings.md` for production hazards.
4. `docs/adr/` for decisions already made (why, not a live spec).
5. `README.md`, `frontend/README.md`, `backend/README.md`, `ROADMAP.md`, `DEPLOYMENT.md`, `helpers/README.md`, `infra/README.md` for orientation only.

Known stale claims, so you do not "fix" the code to match them:

- `GET /api/health` is liveness. It returns HTTP 200 with `"status": "degraded"` when Supabase is down, so Cloud Run does not restart a site that still serves JSON. `GET /api/health/ready` returns 503 and is the uptime check. ADR 0002 and `backend/README.md` still describe health as failing closed on the database.
- The chat socket also accepts a `history` frame and emits `{type: "action"}` frames. `backend/README.md` only lists `context` and `message`.
- Party mode is not only "toggle the theme 10 times." Konami, `?party=1`, the footer doodle clicks, and the chat `set_theme` tool also set it. Read `theme-store.ts` and `use-easter-eggs.ts`.
- `ROADMAP.md` marks a Terraform plan workflow done. `HANDOFF.md` says that workflow was removed (`29c45e5`) because the planner could read the state bucket. Do not restore it.
- `helpers/README.md` presents `./helpers/deploy.sh` as a normal fallback. `HANDOFF.md` says it replaces Secret Manager bindings with plaintext env vars and skips the canary. Do not run it.
- The system prompt is `backend/app/prompts/portfoliosystemprompt.md`, not under `backend/assets/`.
- Do not quote a test count from a README. Run the suite.

The audit backlog is not a license to fix every finding in a drive-by. If your edit touches one of those sites, do not make it worse, and fix the local case when it is in scope.

## Layout

```
frontend/src/app/          feature UI: sections, chat, admin, providers
frontend/src/shared/       stores, hooks, API client, shared components
frontend/src/styles/       global CSS and component CSS
frontend/src/types/        shared types
backend/app/api/           thin routes: parse, auth, delegate
backend/app/services/      chat streaming, tool normalization
backend/app/models/        Pydantic models and JSON loaders
backend/app/data/          portfolio content (source of truth)
backend/app/config.py      the only place that reads environment variables
backend/app/prompts/       chat system prompt
backend/assets/            resume PDF and party-mode sprites
backend/tests/             pytest; offline
e2e/                       Playwright smoke against the production image
infra/                     Terraform
helpers/                   Dockerfiles, local run, resume PDF generator
.github/workflows/         ci.yml (required checks) and deploy.yml
```

There is no `frontend/src/features/` tree. ESLint mentions that path; do not create it. Features live under `app/`. Cross-cutting code lives under `shared/`. `shared/` must not import from `app/`.

## Commands

From the repo root, Python 3.12 and Node 22.

```bash
pip install -r requirements-dev.txt
python -m ruff check backend
python -m pytest backend/tests -q --cov --cov-report=term-missing
python -m coverage report --fail-under=60 \
  --include='backend/app/middleware/*,backend/app/api/admin_routes.py'

cd frontend
npm run lint          # eslint, --max-warnings 0
npm run type-check
npm test
npm run test:coverage
```

Helper unit tests CI also runs, from the repo root:

```bash
python -m unittest discover -s helpers -p test_verify_deployment.py -v
python -m unittest discover -s helpers -p test_cleanup_revision_tags.py -v
```

Local app (bash, not PowerShell):

```bash
./helpers/local_test.sh
# Vite http://localhost:5173  proxies /api and /ws to :8080
# API + built SPA http://localhost:8080   docs at /docs
```

On this Windows machine, run that script from Git Bash or WSL. Root `.env` is required and gitignored. Do not commit it.

CI on `main` requires four checks: Frontend, Backend, Terraform (`fmt` / `validate`), Docker (Trivy, Playwright smoke, Lighthouse byte budgets). A change is not done because one of those passed.

## Non-negotiables

- No secrets in git, fixtures, logs, prompts, progress notes, or hosted memory. Tests force dummy Supabase, Anthropic, and SendGrid values in `backend/tests/conftest.py` before the app imports. Never `setdefault` over a real key. Never point tests at a live project.
- New configuration goes on the frozen `Settings` object in `backend/app/config.py`. Feature code does not call `os.getenv`. Required boot vars are `REQUIRED_ENV_VARS`; missing ones exit the process.
- Portfolio facts live in `backend/app/data/*.json`. Components fetch them. Do not hardcode employers, projects, or skills in TSX.
- A JSON field change updates the Pydantic model in `backend/app/models/` in the same change. Loaders are cached; restart the process to see edits.
- Every SPA HTTP call goes through `frontend/src/shared/utils/api/` (`getJson` / `postJson` + `endpoints.ts`). The only exception is the resume PDF blob fetch in `resume-provider.tsx`. WebSocket chat is not REST; it stays in `useChat.ts`.
- New public routes are mounted in `backend/app/api/__init__.py`. If the SPA calls them, add the path to `endpoints.ts` in the same change.
- Chat tools are an allowlist. Add the schema in `CHAT_TOOLS` and the validator in `normalize_tool_action` (`backend/app/services/chat_actions.py`) together. Unknown names, sections, modal kinds, themes, and over-long keys return `None` and are not forwarded. The browser only executes the normalized action (`frontend/src/shared/utils/chat-actions.ts`).
- Do not call real Anthropic, Supabase, or SendGrid from tests. Mock at the client boundary the way `test_chat_ws.py` does.
- Blocking Supabase and filesystem calls inside `async def` routes use `asyncio.to_thread`. Ruff's `ASYNC` rules are on.
- Do not cache `/api/health*` or authenticated responses. Public content GET 200s already get a short `Cache-Control`. Hashed `/assets/` are immutable. See the middleware in `main.py`.
- Do not put MUI, Emotion, or tsparticles into the Vite `vendor` chunk. They must stay out of the initial graph. Read the `manualChunks` comment in `frontend/vite.config.ts` before editing the build.
- Coverage floors only move up. Pytest fail-under is 72 in `pyproject.toml`. The auth surface (`middleware/*` and `admin_routes.py`) has its own CI floor of 60. Vitest floors are statements 18, lines 18, branches 15, functions 12, with `include: ['src/**']` so untested files count as zero.
- Do not add a dependency for something the repo already does by hand (chat markdown, focus trap, API client). Ask before a new runtime dependency. Python production deps are hash-pinned: edit `requirements.txt`, regenerate `requirements.lock.txt` with the same tool that produced the lock (do not assume `helpers/compile-requirements.sh` reproduces it; the audit notes it was `uv pip compile --universal`).
- Do not deploy from a laptop. Do not run `helpers/deploy.sh`. Do not `terraform apply` against this project unless the user explicitly asks, and then read the "terraform apply reverts production" section of `HANDOFF.md` first. Production ships only through `.github/workflows/deploy.yml`: build, scan, push a digest, `--no-traffic`, verify the tagged revision, recheck CI, then promote.

## Backend conventions

Routes stay thin. Parsing, status codes, and auth dependencies live in `backend/app/api/`. Streaming, history, rate limits, and prompt assembly live in `backend/app/services/chat_service.py`.

```python
# Prefer this shape
@router.get("/projects/{project_key}", response_model=ProjectDetail)
async def get_project(project_key: str) -> ProjectDetail:
    return load_project(project_key)

# Not this
@router.get("/projects/{project_key}")
async def get_project(project_key: str):
    raw = json.loads(open("backend/app/data/projects.json").read())
    return raw[project_key]
```

- Pydantic v2 models are the response contract. Dict endpoints that already declare `response_model` should stay that way.
- Admin routes depend on `verify_admin_token`. Login must match `ADMIN_EMAIL` and then Supabase. Do not add a second auth mechanism. `GET /api/admin/analytics` and `GET /api/admin/health` are stubs; do not pretend their zeros are real metrics.
- WebSocket origin checks are in `chat_routes.py` because CORS middleware does not cover `websocket` scopes. Same-origin (Origin host equals Host) is allowed, plus `ALLOWED_ORIGINS` for the Vite dev server. Do not require the production hostname to be listed or chat breaks on the other live hostnames.
- Client ids must `fullmatch` `^[A-Za-z0-9._:-]{8,128}$`.
- User messages cap at 2,000 characters. History kept on the connection is 20 messages. Page context caps at 4,000 characters. Seeded `history` frames cap at 100 turns. Per-connection rate limit is 10 messages / 60s. Per-IP is 30. Caps are 5 sockets per IP and 200 total. Idle timeout is 300s. Change these in `chat_service.py` and cover them in `test_chat_ws.py` or `test_chat_manager.py`.
- Health probes must not raise, and the public body must not include exception text.
- Logging goes through `backend/app/utils/logger.py`. Do not `print`. Do not log tokens, API keys, or raw contact-form bodies.

Ruff (`pyproject.toml`): pycodestyle, pyflakes, isort, bugbear, pyupgrade, async. Line length 120. `E501` and `B904` are ignored. Tests ignore `B008` and `B011`. `fastapi.Depends`, `Header`, `Query`, and `Body` are immutable calls so default arguments stay legal.

## Frontend conventions

- React 18 function components, TypeScript `strict`. `@typescript-eslint/no-explicit-any` is an error. `jsx-a11y` recommended rules are errors, including click handlers without keys.
- Import order is ESLint `import/order` with a blank line between groups: builtin, external, internal, parent/sibling, index. Match the file next door rather than fighting the linter.
- Path alias `@/` points at `frontend/src`. Relative imports are what most files use. Do not mix a new style into a file that already has one.
- Global client state is Zustand: `theme-store`, `section-store`, `admin-store`, `telemetry-store`. Server content is the `DataProvider` / `ResumeProvider` context, not a new store.
- Below-fold sections, chat, and admin are `React.lazy`. About stays eager. Each lazy section already has its own `ErrorBoundary` and `Suspense` in `main-content.tsx`. Keep that split.
- Prefer a real `<button>`. If a node cannot be a button, use `buttonize()` from `shared/utils/a11y.ts` so it is focusable, `role="button"`, and Enter/Space activate it.
- Modals: `role="dialog"`, `aria-modal`, `useFocusTrap`, `useEscapeKey`. Experience and About can mount a skill dialog on top of the parent dialog (audit F-3). If you add a nested modal, close the other one first, the way `projects.tsx` does.
- Deep links (`?skill=`, `?project=`, `?company=`) must not use a raw bracket lookup on a parsed object. `obj["constructor"]` is truthy and crashes the section (audit F-2). Use `Object.prototype.hasOwnProperty.call` or a null-prototype object.
- Theme tokens live in `frontend/src/styles/base/variables.css`. Spacing tokens that exist are `xs/sm/md/lg/xl`. `--spacing-s` and `--spacing-m` are undefined; using them drops the whole declaration. Do not invent a parallel set of color variables.
- CSS files sit next to the component under `styles/components/` or are imported from the component. Do not add a CSS-in-JS library. MUI is for the chat dialog only.
- Analytics go through `shared/utils/analytics.ts` after consent. Do not call `gtag` directly. Page views: `trackPageView` and `trackAnchorChange` must not both fire for the same navigation (that double-counted GA4).
- Cookie consent defaults to denied. Do not load analytics before the choice. A withdrawal control is still missing (audit F-5); do not remove the banner's ability to deny.
- Tests sit next to the code as `*.test.ts` / `*.test.tsx`. Vitest, jsdom, Testing Library. Setup mocks are in `src/test/setup.ts`. Follow `useChat.test.ts` for sockets: fake the WebSocket, assert frames, do not open a real one.
- User-visible UI changes need to be exercised in a browser (click, type, deep link, both themes), not only by a screenshot or a unit test.

Chat UI state lives in one `useChat()` owned by `ChatPortal`. `Chat` is presentational. Deep link is `?ai_chat=open`. If `/api/chat/status` says unavailable, the button stays hidden.

## Content edits

| Change | Also touch |
|---|---|
| Wording or a new skill/project/role field | `backend/app/data/*.json` and the matching model in `backend/app/models/` |
| Current employer on the resume | `experience.json`, then regenerate the PDF with `helpers/build_resume_pdf.py`. `test_resume_pdf_matches_the_current_role` compares the generated manifest to JSON. Do not hand-edit the manifest or the PDF to satisfy the test. |
| Portrait path | `aboutme.json` `full_portrait` must exist under `frontend/public/` (`test_portrait_image_exists`) |
| Assistant voice | `backend/app/prompts/portfoliosystemprompt.md` only. Do not paste secrets or private context into it. |
| Party sprites | `backend/assets/zuni/subject_N.webp`. `GET /api/zuni?subject=N` must stay deterministic (`test_zuni_subject_parameter_is_honoured`). |

## Tests worth extending

| File | Locks |
|---|---|
| `backend/tests/test_chat_ws.py` | Frame protocol, history seed, size and rate limits, error recovery |
| `backend/tests/test_chat_actions.py` | Tool allowlist |
| `backend/tests/test_chat_manager.py` | Connection caps and history bounds |
| `backend/tests/test_admin_auth.py` | Login email gate and bearer routes |
| `backend/tests/test_middleware.py` | Security headers and cache policy |
| `backend/tests/test_data.py` | JSON loads, portrait, resume/role match, zuni subjects |
| `backend/tests/test_custom_resolution.py` | Path injection and XSS on the viewport helper |
| `backend/tests/test_config.py` | Settings parsing |
| `frontend` `useChat` tests | One socket, context frame, chunk assembly, malformed frames |
| `e2e/` | Page load, sections, chat panel. It boots the image with dummy credentials. It does not replace unit tests. |

A behavior change without a test in the matching file is unfinished.

## Production boundaries

Runtime secrets (`supabase_url`, `supabase_anon_key`, `supabase_service_role`, `anthropic_api_key`, `sendgrid_api_key`) belong in Secret Manager, mounted as `secretKeyRef`. GitHub Actions authenticates with Workload Identity Federation. There are no service-account keys.

`helpers/deploy.sh` and a casual `terraform apply` are unsafe on this project. The state bucket has been documented as readable by project Viewer, with plaintext secrets inside, and apply can roll the live image back to the mutable `:latest` tag. Treat `HANDOFF.md` as the ops runbook. Rollback is a traffic shift to the previous Cloud Run revision, not a rebuild.

Open product bets (do not start them unless asked): staging service, CDN in front of static files, OpenTelemetry, a service worker, grouping chat transcripts by session. `ROADMAP.md` lists them.

## This workstation

These paths exist on the owner's machine. If a command is missing, say so and keep working from source. Do not block a code change on them.

- Shared graph: query before a wide search. Corpus root is `C:\Users\jkail\Documents\projects` (WSL `/mnt/c/Users/jkail/Documents/projects`). Omit `project_path`. Ask about `portfolio` symbols and check that returned files are under `portfolio/`, because blackbox and encore share the graph. After source edits: `wsl.exe -d Ubuntu --exec /home/jkail/.local/bin/graphify-shared update`. Never replace the shared graph with a child-repo build.
- Agent Hub handoff: `C:/Users/jkail/.agents/agent-hub.cmd checkpoint --cwd` the portfolio repo. Memory tag `repo_portfolio__5205c8fa15194de3`. Store decisions and conventions, not secrets, transcripts, or `.env` values.
- Cursor on this machine reaches shared tools through Agent Hub, not a project `.mcp.json`. Leave project MCP files empty.

## Done

Say what you ran and what you did not run. For a backend change that is `ruff` and `pytest`. For a frontend change that is `lint`, `type-check`, and `npm test`, plus a browser pass when the UI changed. For a content-only JSON change, `pytest backend/tests/test_data.py` is the minimum. Do not claim the Docker or Terraform checks passed unless you ran them.
