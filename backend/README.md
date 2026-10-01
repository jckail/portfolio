# Backend Technical Documentation 🔧

FastAPI service that powers [jckail.com](https://www.jckail.com): portfolio
data APIs, a streaming AI assistant, contact email, telemetry, and an admin
panel. In production it also serves the built frontend from `frontend/dist`.

## Technology Stack

- **FastAPI** + **Uvicorn** (ASGI) on **Python 3.12+**
- **Pydantic v2** for data models and validation
- **Vertex AI Gemini** (or Anthropic Claude) for the AI chat assistant (WebSocket streaming)
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
GET /api/contact/info               # Contact details
```

### Resume

```http
GET /api/resume                     # Serve the resume PDF (?download to force download)
GET /api/resume_file_name           # Resume file name
```

### AI assistant

The assistant is powered by Anthropic's **Claude Haiku 4.5** and streams
responses over a WebSocket connection:

```http
GET /api/chat/status                # {"available": bool} - frontend hides the chat button when false
WS  /ws/{client_id}
```

Client → server messages (JSON):

- `{"type": "context", "content": "..."}` — current page context for the assistant
- `{"type": "message", "content": "...", "ga_session_id": "..."}` — a user message

Server → client messages:

- `{"message": "...", "sender": "assistant", "is_chunk": true}` — streamed text chunk
- `{"message": "", "sender": "assistant", "is_chunk": false}` — completion frame
  (an empty message means "use the accumulated chunks")

Implementation notes:

- The model sits behind a provider interface (`backend/app/services/llm/`):
  `vertex_gemini.py` (Vertex AI REST + SSE through httpx) and `anthropic.py`.
  Settings (all read in `config.py`):

  | Variable | Default | Meaning |
  |---|---|---|
  | `CHAT_PROVIDER` | `vertex` if `VERTEX_API_KEY` is set, else `anthropic` | `vertex` or `anthropic` |
  | `VERTEX_API_KEY` | none (secret) | Service-account-bound API key; sent only in the `x-goog-api-key` header |
  | `ANTHROPIC_API_KEY` | none (secret) | Used when the provider is `anthropic` |
  | `CHAT_MODEL` | `gemini-3.1-flash-lite` (vertex), `claude-haiku-4-5` (anthropic) | Primary model |
  | `CHAT_FALLBACK_MODEL` | `gemini-2.5-flash` | Vertex only: used after the primary fails twice (5xx, timeout) |
  | `CHAT_MAX_TOKENS` | `1024` | Caps response length |
  | `CHAT_DAILY_TOKEN_BUDGET` | `2000000` | Tokens per UTC day per instance; chat reports unavailable once spent (resets on cold start) |

  `/api/chat/status` is true only when the provider's key is set, the auth
  circuit breaker is closed and the daily budget is not spent. Neither chat key
  is required to boot; without one the assistant is simply unavailable.
- Conversation history is kept per connection (bounded), so follow-up
  questions work.
- The static system prompt (`backend/app/prompts/portfoliosystemprompt.md`) and
  portfolio data are byte-stable so provider prompt caching applies (explicit
  cache breakpoints on Anthropic) to cut latency and cost.
- Messages are capped at 2,000 characters and rate limited to 10 per minute
  per connection.

### Contact

```http
POST /api/contact/send-email        # Send a contact-form email via SendGrid
```

### Telemetry & logging

```http
POST /api/telemetry                 # Store frontend telemetry
POST /api/log                       # Store one frontend log line
POST /api/log/batch                 # Store a batch of frontend log lines
GET  /api/logs                      # Read logs (admin token, or loopback + DEV_MODE=true)
GET  /api/health                    # Service + database health probe
```

### Admin (Supabase-authenticated)

```http
POST /api/admin/login               # Email/password login -> bearer token
POST /api/admin/logout              # Invalidate the current session
GET  /api/admin/verify              # Validate the current token
GET  /api/admin/analytics           # Analytics summary
GET  /api/admin/logs                # Application log files
GET  /api/admin/health              # System health details
```

### Misc

```http
GET /api/custom_resolution          # Render the site in an iframe at a given device resolution
GET /api/zuni                       # Random image endpoint
```

## Architecture 🏗️

```
backend/
├── app/
│   ├── api/            # Route modules (thin: parse/validate + delegate)
│   ├── services/       # Business logic (chat_service: Claude streaming,
│   │                   #   history, rate limits, prompt caching;
│   │                   #   owner_mail: SendGrid notifications to ADMIN_EMAIL)
│   ├── config.py       # Centralized typed settings (all env access lives here)
│   ├── middleware/     # Auth dependency, response headers, selective gzip
│   ├── models/         # Pydantic models + JSON data loaders (cached)
│   ├── data/           # Portfolio content as JSON (source of truth)
│   ├── utils/          # Logging (Supabase batching handler), Supabase client
│   └── main.py         # App entry: env validation, CORS, lifespan, static files
├── assets/             # System prompt, resume, images
└── tests/              # Pytest suite (offline; Anthropic/Supabase mocked)
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

## Development Guide 👩‍💻

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
python -m pytest backend/tests     # 105 tests
python -m ruff check backend       # lint (config in pyproject.toml)
```

The suite runs offline (no real Supabase/Anthropic credentials needed) and
covers the response-header middleware, the `custom_resolution` XSS guards,
the chat `ConnectionManager`, the full chat WebSocket protocol (with a
mocked Anthropic client), settings parsing, and portfolio-data integrity.
CI runs ruff and the tests on every push and pull request.

### Environment Variables

Required at startup (validated in `main.py`):

```env
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE=...
ALLOWED_ORIGINS=http://localhost:5173      # comma-separated, exact origins
PRODUCTION_URL=http://localhost:8080
PORT=8080
ADMIN_EMAIL=you@example.com
RESUME_FILE=YourResume.pdf
ANTHROPIC_API_KEY=sk-ant-...    # or VERTEX_API_KEY for the Vertex provider (one is enough)
SENDGRID_API_KEY=SG....
```

Optional:

```env
CHAT_PROVIDER=vertex            # vertex | anthropic (see the chat settings table)
CHAT_MODEL=gemini-3.1-flash-lite  # override the assistant model
CHAT_MAX_TOKENS=1024            # cap assistant response length
CONTACT_SENDER_EMAIL=...        # SendGrid verified sender (defaults to assistant@jordan-kail.com)
GIT_COMMIT=...                  # reported by /api/health (set automatically by CI deploys)
DEV_MODE=true                   # allow unauthenticated log reads from loopback
```

All of these are read through `app/config.py` — add new configuration there
rather than calling `os.getenv` in feature code.

## Security Notes 🔒

- CORS origins must be exact strings (no wildcard ports).
- Admin routes require a Supabase bearer token matching `ADMIN_EMAIL`.
- The chat WebSocket enforces message-size and rate limits.
- `custom_resolution` validates and escapes its path input.
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
