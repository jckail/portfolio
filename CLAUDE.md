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

- `GET /api/health` is liveness. It returns HTTP 200 with `"status": "degraded"` when Supabase is down, so Cloud Run does not restart a site that still serves JSON. `GET /api/health/ready` returns 503 and is the uptime check. ADR 0002 still describes health as failing closed on the database.
- Party mode is not only "toggle the theme 10 times." Konami, `?party=1`, the footer doodle clicks, and the chat `set_theme` tool also set it. Read `theme-store.ts` and `use-easter-eggs.ts`.
- `ROADMAP.md` once marked a Terraform plan workflow done. `HANDOFF.md` says that workflow was removed (`29c45e5`) because the planner could read the state bucket. Do not restore it.
- `helpers/deploy.sh` still exists and `helpers/README.md` and `DEPLOYMENT.md` mention it. `HANDOFF.md` says it replaces Secret Manager bindings with plaintext env vars and skips the canary. Do not run it.
- Older ADRs (0001 to 0004) and the audit documents name Anthropic as the chat model. Chat now goes through a provider layer; the default provider is Vertex AI Gemini when `VERTEX_API_KEY` is set (ADR 0005).
- The audit's F-5 (consent cannot be withdrawn) is partly fixed: the footer has a "Cookie settings" control (`openCookieSettings`). Consent Mode v2 signals are a separate open question in the audit.
- `GET /api/admin/analytics` and `GET /api/admin/health` are no longer zero stubs. They return process-local counters from `utils/metrics.py` (one instance since it started, not site totals). Do not present them as site-wide numbers.
- The resume PDF is generated from `backend/app/data/*.json` by `helpers/build_resume_pdf.py`. It is not an Enhancv export and it is not hand-edited.
- The system prompt is `backend/app/prompts/portfoliosystemprompt.md`, not under `backend/assets/`.
- Do not quote a test count or a coverage number from a README. Run the suite. Floors live in `pyproject.toml`, `frontend/vitest.config.ts` and `.github/workflows/ci.yml`.

The audit backlog is not a license to fix every finding in a drive-by. If your edit touches one of those sites, do not make it worse, and fix the local case when it is in scope.

## Layout

```
frontend/src/app/          feature UI: sections, chat, admin, providers
frontend/src/shared/       stores, hooks, API client, shared components
frontend/src/styles/       global CSS and component CSS
frontend/src/types/        shared types
backend/app/api/           thin routes: parse, auth, delegate
backend/app/services/      chat streaming, tool registry and validators, owner mail
backend/app/services/llm/  chat provider layer (Vertex Gemini, Anthropic)
backend/app/models/        Pydantic models and JSON loaders
backend/app/data/          portfolio content (source of truth)
backend/app/config.py      the only place that reads environment variables
backend/app/prompts/       chat system prompt
backend/app/middleware/    auth, response headers, compression, access log
backend/app/utils/         logger, log_event contract, process metrics, rate limits
backend/assets/            generated resume (PDF, text, manifest) and party-mode sprites
backend/tests/             pytest; offline
e2e/                       Playwright smoke against the production image
infra/                     Terraform (some of it written but not applied, see below)
helpers/                   Dockerfiles, local run, e2e-docker.sh, resume PDF generator
.github/workflows/         ci.yml (required checks) and deploy.yml
```

There is no `frontend/src/features/` tree. ESLint mentions that path; do not create it. Features live under `app/`. Cross-cutting code lives under `shared/`. `shared/` must not import from `app/`.

## Architecture notes

Verify against source before relying on a line here.

**Chat provider layer.** `backend/app/services/llm/` holds a provider-neutral request and event model (`base.py`: `LLMRequest`, `TextDelta`, `ToolCall`, `Usage`, `Finish`, and `ProviderError` subclasses whose `kind` is a log-safe label). `vertex_gemini.py` talks to Vertex AI over REST and SSE with httpx (no SDK). `anthropic.py` is the alternative. `build_provider(settings)` picks one. `chat_service.py` builds one request and consumes normalized events; it never branches on a vendor.

- Settings (all in `config.py`): `CHAT_PROVIDER` (`vertex` or `anthropic`; unset means `vertex` when `VERTEX_API_KEY` exists, else `anthropic`), `VERTEX_API_KEY`, `ANTHROPIC_API_KEY`, `CHAT_MODEL`, `CHAT_FALLBACK_MODEL` (Vertex only), `CHAT_MAX_TOKENS`, `CHAT_DAILY_TOKEN_BUDGET`. Neither chat key is required to boot; without one `/api/chat/status` says unavailable.
- The Vertex key must be bound to the `portfolio-vertex` service account and restricted to `aiplatform.googleapis.com` (ADR 0005). It goes only in the `x-goog-api-key` header. Never put it in a URL, a log line, an error message or a test.
- Provider failures are mapped to a short `kind` and never carry response text. An auth failure opens a circuit breaker and hides the chat button.

**Chat tools: read vs execute.** `chat_tools.py` is the registry (`ALL_TOOLS`, `TOOL_KINDS`).

- `read` tools: the browser tools `navigate_section`, `open_modal`, `download_resume`, `set_theme` (schemas in `CHAT_TOOLS` in `chat_actions.py`, validated by `normalize_tool_action`, forwarded as `action` frames) and `search_portfolio` (runs on the server over the portfolio JSON; the result goes back to the model).
- `execute` tools: `contact_jordan`, `request_phone`, `request_meeting`. The model never runs them. Calling one only creates a pending action (random id, bound to the connection, single use, 10 minute life, at most 5 per connection) and sends a `confirm_action` frame. Only the visitor's `confirm_action` frame, carrying an email address they typed, runs the handler, under the same rate limiters as the REST contact routes (ADR 0006). Do not add an execute tool that skips the card.
- WebSocket frames. Client to server: `context`, `history`, `message`, `confirm_action {id, email, args?}`, `cancel_action {id}`. Server to client: plain message frames (`{message, sender, is_chunk}`), `{type: "action", ...}`, `{type: "confirm_action", id, tool, args, needs: ["email"]}`, `{type: "action_result", id, ok, message, tool?, phone?}`. Tool rounds are capped (`MAX_TOOL_ROUNDS`, `MAX_TOOL_CALLS_PER_ROUND` in `chat_service.py`). Tests: `test_chat_tools.py`, `test_chat_tools_ws.py`, `test_chat_actions.py`, `test_llm_*.py`.
- The phone number comes only from `CONTACT_PHONE` (Secret Manager) and is revealed through `POST /api/contact/phone` or a confirmed `request_phone`. It must never appear in git, JSON data, prompts, docs or generated files.

**Events and logs.** `utils/events.py` `log_event(name, **fields)` writes one JSON line; `KNOWN_EVENTS` is a closed set and field names containing email, ip, message, text, body, query, key, token and similar are dropped by `sanitize_fields`. Terraform log-based metrics filter on `jsonPayload.event`, so renaming an event breaks an alert. `POST /api/events` is the first-party product event sink: anonymous, 204, validated against `EVENT_NAMES` and per-prop allowlists, only emits `event.received`. `EVENT_NAMES` must equal `frontend/src/shared/analytics/events.ts` (a test checks it). The SPA sends events only after analytics consent.

**Discovery and crawler surfaces.** `api/discovery.py` builds everything from the portfolio JSON: a semantic HTML snapshot injected into `#root` of `index.html` (React replaces it on mount), a JSON-LD graph, `/llms.txt`, `/llms-full.txt`, `/resume.json` (JSON Resume 1.0.0) and `/sitemap.xml`. Routes are in `discovery_routes.py` and sit at the site root, not under `/api`. Absolute URLs use the canonical origin `https://www.jckail.com`. No phone number is ever included. Tests: `test_discovery.py`, `test_seo.py`, `test_bootstrap_html.py`.

**Resume.** `helpers/build_resume_pdf.py` writes `backend/assets/JordanKailResume.pdf`, `.txt` and `.meta.json` from `backend/app/data/*.json` (single column, ATS-shaped, no phone number, no invented education). reportlab is not a repo dependency; the script's docstring has the `uv run --no-project --with ...` command. `test_resume_pdf.py` and `test_data.py` fail when data and artifacts drift. Regenerate; never hand-edit.

**Observability and Terraform that is written but not applied.** `infra/vertex.tf`, `observability.tf`, `dashboard.tf`, `audit.tf`, `budget.tf` and the extra uptime checks in `monitoring.tf` describe resources that production has not been planned or applied against (see `HANDOFF.md`, "Terraform now describes more than production has applied"). CI only runs `fmt` and `validate`. Do not `terraform plan` or `apply` from an agent session. Keep the event names and labels in `observability.tf` in step with `KNOWN_EVENTS` by hand; no test compares them. `test_events.py` and `test_observability.py` cover the logger, access log, `/api/events` and the frontend/backend event-name match.

## Commands

From the repo root, Python 3.12 and Node 22.

```bash
pip install -r requirements-dev.txt
python -m ruff check backend
python -m pytest backend/tests -q --cov --cov-report=term-missing
# CI also gates the auth surface separately; the floor is in .github/workflows/ci.yml
python -m coverage report --include='backend/app/middleware/*,backend/app/api/admin_routes.py'

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

Browser e2e without installing Chromium libraries (needs Docker; run `npm ci` in `e2e/` once):

```bash
E2E_BASE_URL=http://localhost:8080 ./helpers/e2e-docker.sh              # whole suite
E2E_BASE_URL=http://localhost:8080 ./helpers/e2e-docker.sh tests/smoke.spec.ts
```

It runs the pinned Playwright image against a server you already started. The page must stay on `localhost` (the CSP upgrades other http hosts to https). It does not call real model providers if you start the backend with an empty `VERTEX_API_KEY` and `ANTHROPIC_API_KEY`.

CI on `main` requires four checks: Frontend, Backend, Terraform (`fmt` / `validate`), Docker (Trivy, Playwright smoke, Lighthouse byte budgets). A change is not done because one of those passed.

## Non-negotiables

- No secrets in git, fixtures, logs, prompts, progress notes, or hosted memory. Tests force dummy Supabase, Anthropic, Vertex, and SendGrid values in `backend/tests/conftest.py` before the app imports. Never `setdefault` over a real key. Never point tests at a live project.
- New configuration goes on the frozen `Settings` object in `backend/app/config.py`. Feature code does not call `os.getenv`. Required boot vars are `REQUIRED_ENV_VARS`; missing ones exit the process.
- Portfolio facts live in `backend/app/data/*.json`. Components fetch them. Do not hardcode employers, projects, or skills in TSX.
- Truthfulness. Site, resume, prompt and doc content uses only facts the owner stated or that are already in `backend/app/data/*.json`. Never invent a number, product, patent count, title, date, metric or education. A figure you cannot source stays out. Unfilled templates (`{{TOKEN}}`, `[[x]]`, `TODO`, `TBD`, `FIXME`, lorem ipsum) must never reach a published surface: `backend/tests/test_content_placeholders.py` scans the data, prompt, resume text and PDF, `index.html` and `frontend/public` and fails the build (ADR 0007).
- No phone number, key or private-notes path in any committed file, including docs and tests.
- A JSON field change updates the Pydantic model in `backend/app/models/` in the same change. Loaders are cached; restart the process to see edits.
- Every SPA HTTP call goes through `frontend/src/shared/utils/api/` (`getJson` / `postJson` + `endpoints.ts`). The only exception is the resume PDF blob fetch in `resume-provider.tsx`. WebSocket chat is not REST; it stays in `useChat.ts`.
- New public routes are mounted in `backend/app/api/__init__.py`. If the SPA calls them, add the path to `endpoints.ts` in the same change.
- Chat tools are an allowlist. A browser tool needs its schema in `CHAT_TOOLS` and its validator in `normalize_tool_action` (`backend/app/services/chat_actions.py`) together. Unknown names, sections, modal kinds, themes, and over-long keys return `None` and are not forwarded. The browser only executes the normalized action (`frontend/src/shared/utils/chat-actions.ts`). A tool that sends mail or reveals contact data is an execute tool: it goes in `EXECUTE_TOOLS` in `chat_tools.py`, only proposes a pending action, and runs only from the visitor's confirm frame with their email. Register it in `TOOL_KINDS`, validate it in `validate_execute_args`, and add tests in `test_chat_tools.py` and `test_chat_tools_ws.py`.
- Do not call real Anthropic, Vertex, Supabase, or SendGrid from tests. Mock at the client boundary the way `test_chat_ws.py` and `test_llm_vertex.py` do.
- Do not log or emit in an event an email address, message body, raw IP, phone number or key. Add new events to `KNOWN_EVENTS` and keep fields to small closed sets.
- Blocking Supabase and filesystem calls inside `async def` routes use `asyncio.to_thread`. Ruff's `ASYNC` rules are on.
- Do not cache `/api/health*` or authenticated responses. Public content GET 200s already get a short `Cache-Control`. Hashed `/assets/` are immutable. See the middleware in `main.py`.
- Do not put MUI, Emotion, or tsparticles into the Vite `vendor` chunk. They must stay out of the initial graph. Read the `manualChunks` comment in `frontend/vite.config.ts` before editing the build.
- Coverage floors only move up. They live in `pyproject.toml` (pytest `fail_under`), `.github/workflows/ci.yml` (the auth surface, `middleware/*` and `admin_routes.py`) and `frontend/vitest.config.ts` (which uses `include: ['src/**']` so untested files count as zero). Read the numbers there; do not copy them into docs.
- Do not add a dependency for something the repo already does by hand (chat markdown, focus trap, API client). Ask before a new runtime dependency. Python production deps are hash-pinned: edit `requirements.txt`, regenerate `requirements.lock.txt` with the same tool that produced the lock (do not assume `helpers/compile-requirements.sh` reproduces it; the audit notes it was `uv pip compile --universal`).
- A new Vite chunk rule must not name MUI, Emotion or tsparticles. `manualChunks` returns `undefined` for them on purpose (a named chunk once caused a circular-chunk white screen). Chat and admin stay lazy.
- Do not deploy from a laptop. Do not run `helpers/deploy.sh`. Do not `terraform plan` or `apply` against this project unless the user explicitly asks, and then read the "terraform apply reverts production" section of `HANDOFF.md` first. Production ships only through `.github/workflows/deploy.yml`: build, scan, push a digest, `--no-traffic`, verify the tagged revision, recheck CI, then promote.

## Backend conventions

Routes stay thin. Parsing, status codes, and auth dependencies live in `backend/app/api/`. Streaming, history, rate limits, tool rounds and prompt assembly live in `backend/app/services/chat_service.py`; vendor wire formats live only in `backend/app/services/llm/`.

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
- Admin routes depend on `verify_admin_token`. Login must match `ADMIN_EMAIL` and then Supabase. Do not add a second auth mechanism. `GET /api/admin/analytics` and `GET /api/admin/health` report process-local counters; label them as one instance, not site totals.
- WebSocket origin checks are in `chat_routes.py` because CORS middleware does not cover `websocket` scopes. Same-origin (Origin host equals Host) is allowed, plus `ALLOWED_ORIGINS` for the Vite dev server. Do not require the production hostname to be listed or chat breaks on the other live hostnames.
- Client ids must `fullmatch` `^[A-Za-z0-9._:-]{8,128}$`.
- User messages cap at 2,000 characters. History kept on the connection is 20 messages. Page context caps at 4,000 characters. Seeded `history` frames cap at 100 turns. Per-connection rate limit is 10 messages / 60s. Per-IP is 30. Caps are 5 sockets per IP and 200 total. Idle timeout is 300s. Change these in `chat_service.py` and cover them in `test_chat_ws.py` or `test_chat_manager.py`.
- Health probes must not raise, and the public body must not include exception text.
- Logging goes through `backend/app/utils/logger.py` (stdout JSON with Cloud Logging fields) and `log_event`. Do not `print`. Do not log tokens, API keys, emails, phone numbers, raw IPs or contact/chat message bodies. Access lines come from `middleware/access_log.py` and carry no query string or client address.

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
- Cookie consent defaults to denied. Do not load analytics, and do not start the first-party event tracker (`shared/analytics/`), before the choice; stop it when consent is withdrawn. The footer's "Cookie settings" reopens the choice; keep it. New product events are added to `EVENT_NAMES` in `shared/analytics/events.ts` and the backend list together.
- Tests sit next to the code as `*.test.ts` / `*.test.tsx`. Vitest, jsdom, Testing Library. Setup mocks are in `src/test/setup.ts`. Follow `useChat.test.ts` for sockets: fake the WebSocket, assert frames, do not open a real one.
- User-visible UI changes need to be exercised in a browser (click, type, deep link, both themes), not only by a screenshot or a unit test.

Chat UI state lives in one `useChat()` (`app/components/chat/hooks/useChat.ts`) owned by `ChatPortal`. `Chat` is presentational. `confirm_action` frames render a `ConfirmActionCard` that asks for the visitor's email; `action_result` closes it. Deep link is `?ai_chat=open`. If `/api/chat/status` says unavailable, the button stays hidden.

## Content edits

| Change | Also touch |
|---|---|
| Wording or a new skill/project/role field | `backend/app/data/*.json` and the matching model in `backend/app/models/` |
| Any role, bullet or skill that appears on the resume | the JSON, then regenerate with `helpers/build_resume_pdf.py` (PDF, `.txt`, `.meta.json`). `test_resume_pdf.py` and `test_data.py::test_resume_pdf_matches_the_current_role` compare them to the JSON. Do not hand-edit the artifacts to satisfy a test. |
| Anything the crawler snapshot, `llms.txt` or `resume.json` shows | the JSON only; `discovery.py` derives them. |
| Portrait path | `aboutme.json` `full_portrait` must exist under `frontend/public/` (`test_portrait_image_exists`) |
| Assistant voice | `backend/app/prompts/portfoliosystemprompt.md` only. Do not paste secrets or private context into it. |
| Party sprites | `backend/assets/zuni/subject_N.webp`. `GET /api/zuni?subject=N` must stay deterministic (`test_zuni_subject_parameter_is_honoured`). |

## Tests worth extending

| File | Locks |
|---|---|
| `backend/tests/test_chat_ws.py` | Frame protocol, history seed, size and rate limits, error recovery |
| `backend/tests/test_chat_actions.py` | Browser-tool allowlist |
| `backend/tests/test_chat_tools.py`, `test_chat_tools_ws.py` | `search_portfolio`, pending actions, confirm and cancel, limits |
| `backend/tests/test_llm_vertex.py`, `test_llm_chat_service.py` | Provider mapping, errors, secrets never leaking |
| `backend/tests/test_events.py`, `test_observability.py` | `log_event` sanitising, access log, `/api/events` allowlist, admin counters, event-name list matches the frontend |
| `backend/tests/test_discovery.py`, `test_seo.py`, `test_bootstrap_html.py` | llms.txt, resume.json, sitemap, HTML snapshot |
| `backend/tests/test_resume_pdf.py`, `test_content_placeholders.py` | Generated resume matches data; no placeholders published |
| `backend/tests/test_chat_manager.py` | Connection caps and history bounds |
| `backend/tests/test_admin_auth.py` | Login email gate and bearer routes |
| `backend/tests/test_middleware.py` | Security headers and cache policy |
| `backend/tests/test_data.py` | JSON loads, portrait, resume/role match, zuni subjects |
| `backend/tests/test_custom_resolution.py` | Path injection and XSS on the viewport helper |
| `backend/tests/test_config.py` | Settings parsing |
| `frontend` `useChat` and `ConfirmActionCard` tests | One socket, context frame, chunk assembly, malformed frames, confirm and cancel |
| `e2e/` | Page load, sections, chat panel. It boots the image with dummy credentials. It does not replace unit tests. |

A behavior change without a test in the matching file is unfinished.

## Hosted apps

Other projects reach `jckail.com/<slug>` as a hosted demo (served here, synthetic data, runs in the browser) or as a 302 forward to the app's own domain. Data: `backend/app/data/labs/<slug>.json` and `backend/app/data/forwards.json`; lab UI: `frontend/src/app/labs/<slug>/lab.tsx` (default export, self-contained, lazy via `LabHost`). Slug rules, reserved slugs and the checklist are in `docs/apps.md`. Do not change another app's Cloud Run service or domain mapping from this repo.

## Production boundaries

Runtime secrets (`supabase_url`, `supabase_anon_key`, `supabase_service_role`, `anthropic_api_key`, `sendgrid_api_key`, `vertex-api-key`, `contact-phone`) belong in Secret Manager, mounted as `secretKeyRef`. GitHub Actions authenticates with Workload Identity Federation. There are no service-account keys.

`helpers/deploy.sh` and a casual `terraform apply` are unsafe on this project. The state bucket has been documented as readable by project Viewer, with plaintext secrets inside, and apply can roll the live image back to the mutable `:latest` tag. Treat `HANDOFF.md` as the ops runbook. Rollback is a traffic shift to the previous Cloud Run revision, not a rebuild.

Open product bets (do not start them unless asked): staging service, CDN in front of static files, OpenTelemetry, a service worker, grouping chat transcripts by session. Applying the new Terraform (observability, Vertex, budgets) is an owner decision, not a task. `ROADMAP.md` lists them.

## This workstation

These paths exist on the owner's machine. If a command is missing, say so and keep working from source. Do not block a code change on them.

- Shared graph: query before a wide search. Corpus root is `C:\Users\jkail\Documents\projects` (WSL `/mnt/c/Users/jkail/Documents/projects`). Omit `project_path`. Ask about `portfolio` symbols and check that returned files are under `portfolio/`, because blackbox and encore share the graph. After source edits: `wsl.exe -d Ubuntu --exec /home/jkail/.local/bin/graphify-shared update`. Never replace the shared graph with a child-repo build.
- Agent Hub handoff: `C:/Users/jkail/.agents/agent-hub.cmd checkpoint --cwd` the portfolio repo. Memory tag `repo_portfolio__5205c8fa15194de3`. Store decisions and conventions, not secrets, transcripts, or `.env` values.
- Cursor on this machine reaches shared tools through Agent Hub, not a project `.mcp.json`. Leave project MCP files empty.

## Done

Say what you ran and what you did not run. For a backend change that is `ruff` and `pytest`. For a frontend change that is `lint`, `type-check`, and `npm test`, plus a browser pass when the UI changed. For a content-only JSON change, `pytest backend/tests/test_data.py` is the minimum. Do not claim the Docker or Terraform checks passed unless you ran them.
