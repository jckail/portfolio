# Backend Technical Documentation

FastAPI service that powers [jckail.com](https://www.jckail.com): portfolio
data APIs, crawler-readable discovery documents, a streaming AI assistant with
visitor-confirmed actions, contact email, telemetry, first-party product events
and an admin panel. In production it also serves the built frontend from `frontend/dist`.

## Technology Stack

- **FastAPI** + **Uvicorn** (ASGI) on **Python 3.12+**
- **Pydantic v2** for data models and validation
- **Vertex AI Gemini** (default when `VERTEX_API_KEY` is set) or **Anthropic Claude** for the AI chat assistant (WebSocket streaming), behind a provider interface
- **httpx** for the Vertex REST + SSE client (no vendor SDK)
- **Supabase** for admin auth, telemetry, and log/chat persistence
- **SendGrid** for contact-form email

## API Reference

All REST endpoints are mounted under `/api`. Interactive docs are available
at `/docs` when the server is running.

### Portfolio data

```http
GET /api/aboutme                    # About-me content
GET /api/experience                 # All experience entries
GET /api/experience/{company_key}   # One experience entry
GET /api/projects                   # All projects
GET /api/projects/{project_key}     # One project
GET /api/skills                     # All skills
GET /api/skills/{skill_name}        # One skill
GET /api/contact/info               # Contact details (never includes a phone number)
```

### Hosted labs and forwards

```http
GET /api/labs                       # Validated lab records (backend/app/data/labs/*.json)
GET /api/labs/{slug}                # One lab record (404 when unknown)
GET /{slug}  and  /{slug}/          # Forwarded app: 302 to its own domain (forwards.json); hosted lab: SPA document, 200
```

See [`docs/labs.md`](../docs/labs.md).

### Discovery documents (site root, not under `/api`)

Generated from the same JSON the SPA renders (`api/discovery.py`), cached for
the life of the process, served with an ETag and open CORS.

```http
GET /llms.txt                       # llmstxt.org summary for LLM agents
GET /llms-full.txt                  # Long form
GET /resume.json                    # JSON Resume 1.0.0
GET /sitemap.xml                    # Sitemap with lastmod
```

The home page HTML also carries a semantic snapshot of the portfolio inside
`#root` and a JSON-LD graph, for clients that do not run JavaScript (`spa.py`
injects them; React replaces the snapshot on mount). Absolute URLs use the
canonical origin `https://www.jckail.com`. No document includes a phone number.

### Resume

```http
GET /api/resume                     # Serve the resume PDF (?download to force download)
GET /api/resume_file_name           # Resume file name
```

The PDF, a plain-text copy and a manifest (`backend/assets/JordanKailResume.*`)
are generated from `backend/app/data/*.json` by `helpers/build_resume_pdf.py`
(single column, ATS-shaped, no phone number). They are never edited by hand;
`test_resume_pdf.py` fails when they drift from the data.

### AI assistant

The assistant streams responses over a WebSocket. The model sits behind a
provider interface (`backend/app/services/llm/`): `vertex_gemini.py` (Vertex AI
REST + SSE through httpx) and `anthropic.py`. `chat_service.py` builds one
provider-neutral request and consumes normalized events (text delta, tool call,
usage, finish); providers map their own failures to `ProviderAuthError`,
`ProviderRateLimited` or `ProviderUnavailable`, whose `kind` is a short
log-safe label (never response text).

```http
GET /api/chat/status                # {"available": bool} - frontend hides the chat button when false
WS  /ws/{client_id}
```

Client to server frames (JSON):

- `{"type": "context", "content": "..."}`: current page context (capped, treated as untrusted data)
- `{"type": "history", "messages": [...]}`: replays a browser-stored transcript after a reconnect (capped)
- `{"type": "message", "content": "...", "ga_session_id": "..."}`: a user message
- `{"type": "confirm_action", "id": "...", "email": "...", "args": {...}}`: the visitor pressed Confirm on a card; `args` is the edited draft (ignored for `request_phone`)
- `{"type": "cancel_action", "id": "..."}`: the visitor dismissed a card

Server to client frames:

- `{"message": "...", "sender": "assistant", "is_chunk": true}`: streamed text chunk
- `{"message": "", "sender": "assistant", "is_chunk": false}`: completion frame
  (an empty message means "use the accumulated chunks")
- `{"type": "action", "action": "navigate" | "open_modal" | "download_resume" | "set_theme", ...}`:
  a validated UI action for the SPA to execute
- `{"type": "confirm_action", "id", "tool", "args", "needs": ["email"]}`: a pending action the visitor must confirm
- `{"type": "action_result", "id", "ok", "message", "tool"?, "phone"?}`: outcome of a confirm (or a rejected id)

Tools (`services/chat_tools.py` is the registry):

| Kind | Tools | Behaviour |
|---|---|---|
| read | `navigate_section`, `open_modal`, `download_resume`, `set_theme` | Validated by `normalize_tool_action` (`chat_actions.py`) and forwarded as `action` frames |
| read | `search_portfolio` | Keyword search over the portfolio JSON, run on the server; the snippets go back to the model |
| execute | `contact_jordan`, `request_phone`, `request_meeting` | The model can only propose. A pending action (random id, bound to the connection, single use, 10 minute lifetime, at most 5 open) is created and a `confirm_action` frame is sent. Only the visitor's `confirm_action` frame with an email they typed runs it, under the contact routes' rate limiters. A phone number is returned only in `action_result.phone` |

After proposing an execute tool the model is told the action is pending and
must not claim success. After a confirm or cancel the server appends a short
site note (no personal data) to the history so the next turn knows the outcome.
Tool rounds per message and calls per round are capped (`MAX_TOOL_ROUNDS`,
`MAX_TOOL_CALLS_PER_ROUND`).

Chat settings (all read in `config.py`):

| Variable | Default | Meaning |
|---|---|---|
| `CHAT_PROVIDER` | `vertex` if `VERTEX_API_KEY` is set, else `anthropic` | `vertex` or `anthropic` |
| `VERTEX_API_KEY` | none (secret) | Key bound to the `portfolio-vertex` service account; sent only in the `x-goog-api-key` header. An unbound key is rejected (see ADR 0005 and `infra/README.md`) |
| `ANTHROPIC_API_KEY` | none (secret) | Used when the provider is `anthropic` |
| `CHAT_MODEL` | `gemini-3.1-flash-lite` (vertex), `claude-haiku-4-5` (anthropic) | Primary model |
| `CHAT_FALLBACK_MODEL` | `gemini-2.5-flash` | Vertex only: tried after the primary keeps failing (5xx, timeout) |
| `CHAT_MAX_TOKENS` | `1024` | Caps response length |
| `CHAT_DAILY_TOKEN_BUDGET` | `2000000` | Tokens per UTC day per instance; chat reports unavailable once spent (resets on cold start) |

`/api/chat/status` is true only when the provider's key is set, the auth
circuit breaker is closed and the daily budget is not spent. Neither chat key
is required to boot; without one the assistant is simply unavailable.

Implementation notes:

- Conversation history is kept per connection (bounded), so follow-up
  questions work.
- The static system prompt (`backend/app/prompts/portfoliosystemprompt.md`) and
  portfolio data are byte-stable so provider prompt caching applies (explicit
  cache breakpoints on Anthropic).
- Limits (in `chat_service.py`): 2,000 characters per message; 20 history
  messages kept per connection; 4,000 characters of page context; a `history`
  frame is only accepted on a connection with no history yet and is capped
  (`MAX_SEEDED_TURNS = 100` in `chat_routes.py`, 24,000 characters in
  `chat_service.py`); 10 messages per 60 s per connection, 30 per IP and 120
  instance-wide in the same window; 5 sockets per IP, 200 total; 300 s idle
  timeout.
- The socket accepts same-origin handshakes plus `ALLOWED_ORIGINS`
  (`chat_routes.py`), because CORS middleware does not cover WebSockets.

### Contact

```http
POST /api/contact/send-email        # Send a contact-form email via SendGrid
POST /api/contact/phone             # Body {email}: reveal the phone number (503 when CONTACT_PHONE is unset)
```

The phone number is configuration (`CONTACT_PHONE`, from Secret Manager), never
data in git. The owner is emailed the requester's address first, and the number
is returned only if that notification was accepted.

### Telemetry & logging

```http
POST /api/telemetry                 # Store frontend telemetry
POST /api/log                       # Store one frontend log line
POST /api/log/batch                 # Store a batch of frontend log lines
GET  /api/logs                      # Read logs (admin token, or loopback + DEV_MODE=true)
GET  /api/health                    # Liveness: 200 even when Supabase is down ("status": "degraded")
GET  /api/health/ready              # Readiness: 503 when the database check fails (the uptime check)
POST /api/events                    # First-party product event (204), see "Logging and events"
```

Health semantics: `/api/health` backs the Cloud Run probe, so it must not fail
on a dependency outage; the site renders from local JSON. It reports
`healthy` or `degraded` and a cached database state. `/api/health/ready` fails
closed and is what uptime monitoring and deploy verification use. Neither
public body carries exception text.

### Admin (Supabase-authenticated)

```http
POST /api/admin/login               # Email/password login -> bearer token
POST /api/admin/logout              # Invalidate the current session
GET  /api/admin/verify              # Validate the current token
GET  /api/admin/analytics           # Event and rate-limit counters for this instance (process-local)
GET  /api/admin/logs                # Application log files
GET  /api/admin/health              # Uptime, version, memory, 5xx ratio for this instance
```

### Misc

```http
GET /api/custom_resolution          # Viewport helper; served only when DEV_MODE=true
GET /api/zuni                       # Random image endpoint
```

## Architecture

```
backend/
├── app/
│   ├── api/            # Route modules (thin: parse/validate + delegate)
│   ├── services/       # Business logic (chat_service: streaming, history,
│   │                   #   rate limits, tool rounds, prompt assembly;
│   │                   #   chat_tools / chat_actions: tool registry, validators,
│   │                   #   pending actions; owner_mail: SendGrid to ADMIN_EMAIL)
│   │   └── llm/        # Provider layer: base types, vertex_gemini, anthropic
│   ├── config.py       # Centralized typed settings (all env access lives here)
│   ├── middleware/     # Auth dependency, response headers, selective gzip, access log
│   ├── spa.py          # SPA fallback, HTML snapshot and JSON-LD injection
│   ├── models/         # Pydantic models + JSON data loaders (cached)
│   ├── data/           # Portfolio content as JSON (source of truth); labs/ and forwards.json
│   ├── labs.py         # Lab and forward catalog loader and validation (see docs/labs.md)
│   ├── prompts/        # Chat system prompt
│   ├── utils/          # Logging, log_event, metrics, rate limits, Supabase client
│   └── main.py         # App entry: env validation, CORS, lifespan, static files
├── assets/             # Generated resume (PDF, text, manifest), party sprites, images
└── tests/              # Pytest suite (offline; model, Supabase and SendGrid mocked)
```

Key design points:

- **Typed configuration** — `app/config.py` exposes a frozen `Settings`
  object; no module reads `os.getenv` directly, and required variables are
  validated once at startup.
- **Lifespan management** — startup preloads all JSON data, mounts static
  files, and starts the async log-flush worker; shutdown drains it.
- **Async-safe I/O** — the Supabase SDK is synchronous and log files are on
  disk, so those calls run via `asyncio.to_thread` to keep the event loop free.
- **Logging** — the app logger ships batched logs to Supabase with a local
  file fallback (`app/logs/`).

## Development Guide

### Setup

```bash
# From the repository root
pip install -r requirements.txt

# Configure environment (see below), then:
uvicorn backend.app.main:app --reload --port 8080
```

### Tests & lint

```bash
# From the repository root
pip install -r requirements-dev.txt
python -m pytest backend/tests
python -m ruff check backend       # lint (config in pyproject.toml)
```

The suite runs offline: `conftest.py` forces dummy Supabase, Anthropic, Vertex
and SendGrid values before the app imports, and tests mock at the client
boundary. It covers the middleware, the chat protocol and tools, the provider
layer, discovery documents, events and logging, admin auth, settings parsing
and portfolio-data integrity (including a guard that fails on unfilled
placeholders in published text). CI runs ruff and the tests on every push and
pull request; coverage floors are in `pyproject.toml` and `ci.yml`.

### Environment Variables

Required at startup (`REQUIRED_ENV_VARS` in `config.py`; missing ones exit the process):

```env
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE=...
ALLOWED_ORIGINS=http://localhost:5173      # comma-separated, exact origins
PORT=8080
ADMIN_EMAIL=you@example.com
SENDGRID_API_KEY=SG....
```

For the assistant, set one of `VERTEX_API_KEY` or `ANTHROPIC_API_KEY`
(not required to boot).

Optional:

```env
CHAT_PROVIDER=vertex            # vertex | anthropic (see the chat settings table)
CHAT_MODEL=gemini-3.1-flash-lite  # override the assistant model
CHAT_MAX_TOKENS=1024            # cap assistant response length
CHAT_DAILY_TOKEN_BUDGET=2000000 # per instance per UTC day
CONTACT_PHONE=...               # secret; enables POST /api/contact/phone
ACCESS_LOG=true                 # false turns off the http.request access line
GCP_PROJECT_ID=...              # for Cloud Logging trace correlation (defaults to the production project)
TRUST_FORWARDED_FOR=true        # default on Cloud Run only; TRUSTED_PROXY_HOPS also enables it
PRODUCTION_URL=...              # optional; RESUME_FILE is also optional (the file name comes from aboutme.json)
CONTACT_SENDER_EMAIL=...        # SendGrid verified sender (defaults to assistant@jordan-kail.com)
GIT_COMMIT=...                  # reported by /api/health (set automatically by CI deploys)
DEV_MODE=true                   # allow unauthenticated log reads from loopback
```

All of these are read through `app/config.py` — add new configuration there
rather than calling `os.getenv` in feature code.

## Security Notes

- CORS origins must be exact strings (no wildcard ports).
- Admin routes require a Supabase bearer token matching `ADMIN_EMAIL`.
- The chat WebSocket enforces message-size and rate limits. Actions that send mail or reveal contact data run only from the visitor's own confirm frame.
- The Vertex key is sent only in a header and scrubbed from every error and log line.
- `custom_resolution` validates and escapes its path input, bounds width/height
  to 1-4096, and is served only when `DEV_MODE=true` (it frames the SPA, which
  is unframeable on a deployed site).
- Every response carries security headers (`X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS).
- Responses over 1 KB are gzip-compressed; hashed frontend assets are served
  with immutable one-year cache headers, HTML with `no-cache`. Images, fonts
  and sprites skip gzip (already compressed).
- Content routes (`/api/aboutme`, `/api/skills[/{key}]`, `/api/experience[/{key}]`,
  `/api/projects[/{key}]`, `/api/contact/info`) are rendered once at startup
  into JSON bytes, a gzip variant and a strong `ETag` (`api/content.py`); a
  matching `If-None-Match` gets a body-less 304. Built SPA text files are
  gzip-compressed once per process the same way (`spa.py`).

## Logging and events

- stdout is one JSON object per line with `severity`, `message`, and, when the
  request carried `X-Cloud-Trace-Context`, `logging.googleapis.com/trace` and
  `spanId` (project from `GCP_PROJECT_ID`, default `portfolio-383615`). ERROR
  lines add `serviceContext {service, version=GIT_COMMIT}` and the stack trace
  so Error Reporting groups them.
- `middleware/access_log.py` writes one `http.request` line per API request
  (method, route template, status, `latency_ms`, bytes). Health probes and
  static assets are skipped; `ACCESS_LOG=false` turns it off. No client
  address, query string, headers or bodies are logged.
- `utils/events.py` `log_event(name, **fields)` emits the business events that
  Terraform log-based metrics count (`jsonPayload.event`): `auth.*`,
  `rate_limit.blocked{limiter}`, `ws.rejected_origin`, `contact.*`, `phone.*`,
  `event.received{name}` and the `chat.*` set (`chat.session_open`,
  `chat.message`, `chat.tool_call`, `chat.confirm_requested|accepted|cancelled`,
  `chat.provider_error`, `chat.circuit_open`, `chat.budget_exhausted`).
  `KNOWN_EVENTS` is the closed list; the Terraform metrics in `infra/` filter on it. Fields are sanitised; emails, addresses, message text
  and secrets are dropped. Name every `SlidingWindowLimiter` (`name=`) so
  `rate_limit.blocked` carries a label.
- `POST /api/events` (204) takes `{event, props}` from the SPA after consent.
  The name must be in `EVENT_NAMES` (mirrors `frontend/src/shared/analytics/events.ts`;
  a test keeps them equal) and props are an allowlist validated against the data.
- `GET /api/admin/analytics` and `/api/admin/health` return process-local
  counters (`utils/metrics.py`): one instance since it started, not site totals.
- Access lines and events are not shipped to the Supabase `logs` table.
