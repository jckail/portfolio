# Changelog

Notable changes to the portfolio app and its infrastructure. Format
loosely follows [Keep a Changelog](https://keepachangelog.com/); this
project doesn't cut version tags, so entries are grouped by date instead.

## Unreleased

### Security
- Contact form was an unauthenticated **open relay**: the submitter-supplied
  address was included in `to_emails`, so anyone could have SendGrid deliver
  arbitrary HTML to any recipient, signed by our SPF/DKIM. Mail now goes only
  to `ADMIN_EMAIL`, with the visitor as Reply-To and bodies HTML-escaped.
- Chat WebSocket had **no `Origin` check** (Starlette's CORSMiddleware only
  handles `http` scopes), so any page on the internet could open a socket and
  bill our Anthropic account from a visitor's browser.
- **Rate limits were bypassable.** `client_ip()` read the *leftmost*
  `X-Forwarded-For` hop, which is whatever the caller sent, so every per-IP
  ceiling was attacker-selectable. Now read from the right, with
  `TRUSTED_PROXY_HOPS` for deployments behind more than one proxy.
- **TOCTOU race in `ConnectionManager.connect()`**: the client id was claimed
  after `await accept()`, so two concurrent handshakes both passed and leaked a
  connection slot permanently. Five races against one IP locked that visitor
  out of the chat until the instance restarted.
- Chat session ids were `Date.now()` — guessable. A second socket claiming a
  live id silently inherited the first's reply stream and page context.
- **Path traversal** in telemetry: the session id went straight into
  `os.path.join`, so `../../..` or an absolute path relocated an
  attacker-controlled write outside the log tree.
- Unbounded WebSocket frames (uvicorn's 16 MiB default) could OOM a 512Mi
  instance before any application cap applied — now `--ws-max-size 65536`.
- The AI **system prompt was publicly downloadable** at
  `/api/assets/portfoliosystemprompt.md`; moved out of the served directory.
- Production container no longer runs as root (uid 10001).
- `.security-venv/` (~100 MB) was excluded only by a local
  `.git/info/exclude`; a fresh clone would have committed it.

### Fixed
- **Chat was dead on 3 of 4 production hostnames**, including the host declared
  canonical, because the new Origin check compared only against
  `ALLOWED_ORIGINS` while Cloud Run serves four domain mappings. Same-origin
  handshakes are now always accepted — cross-site forgery requires an Origin
  that differs from the Host, which is the entire signal.
- Asking the assistant for a C++ example **froze the browser tab**: a fence
  whose info string wasn't plain `\w` (```` ```c++ ````, ```` ```c# ````,
  ```` ```{r} ````) matched neither parser branch, so the loop never advanced.
- The global focus ring was **invisible in the default dark theme** (~1.2:1
  against a 3:1 WCAG minimum) because it reused a translucent border token.
- Icon hover contrast fix was inert — the background is set on the `<svg>`
  while a non-hover rule set `color` on the same element (2.46:1 light,
  1:1 party).
- `/api/health` returned **503 when Supabase was unreachable**, so a database
  blip would have Cloud Run restart containers that were serving fine. Split
  into liveness (`/api/health`, 200 + `degraded`) and readiness
  (`/api/health/ready`, fails closed) with the uptime check repointed.
- `/api/zuni?subject=N` **never worked**: the route parameter was named
  `subject_number`, so `subject` was ignored and every call returned a random
  image — party mode's three "distinct" layers could draw the same one.
- `.replace('Bearer ', '')` stripped every occurrence rather than the prefix,
  corrupting any token containing that literal text.
- A dropped WebSocket left the last reply flagged `isStreaming`, so the cursor
  blinked forever and the message was filtered out of the saved transcript.
- `waitForGtag` leaked an interval and an uncleared timeout per tracked event.
- `CompanyLogo`'s `<img>` fallback pointed at `/images/projects/`.

### Changed
- **Together AI added as the current role** (Staff Software Engineer, 02/2025);
  Prove Identity closed at 01/2025. `Experience` and `Projects` became
  `RootModel`s so adding an entry is a data-only change — previously pydantic's
  default `extra="ignore"` would have silently dropped a new employer key.
- **Resume PDF is now generated** by `helpers/build_resume_pdf.py` instead of
  being a hand-updated third-party export, with a manifest that CI compares
  against `experience.json` so it cannot drift silently again. 387 KB → 18 KB.
- **First-paint JS halved**: 177 kB → 87 kB gzipped. `manualChunks` was forcing
  MUI and the particle engine into eagerly-preloaded chunks, defeating the
  lazy boundaries already in the code.
- **Runtime image 98 MB smaller**: `backend/assets/zuni/` held 20 RGBA PNGs up
  to 3024px, drawn as 60×60 particle sprites. Re-encoded to 256px WebP
  (98.0 MB → 248 KB). Docker CI job 3m04s → 2m09s.
- `projects.json`: one copy-pasted `tech_stack` was shared by 7 of 9 projects
  (claiming FastAPI/Supabase/Auth0/GPT-4 for a 2022 Facebook feature), and
  `last_commit` was wrong in both directions — including a repo last pushed in
  2018 advertised as 2020. Now grounded in each project's description and the
  GitHub API.
- Keyboard focus indicators restored (three stylesheets set `outline: none`
  with no replacement); skip-to-content link added; three measured contrast
  failures fixed, the worst at 1.24:1.

### Testing
- 45 → **105 backend tests**; coverage 63% → **73.7%**; auth surface 39.8% →
  **61%** (`auth_middleware.py` 39% → 100%).
- A mutation probe found **the entire admin auth layer could be deleted with
  all 78 tests passing**, and 5 of 10 security-control mutations survived. Two
  causes: WebSocket rejection tests passed by waiting out a 300s idle timeout,
  and the only test touching `/api/admin/*` never asserted a status code.
  Both fixed; auth deletion now fails 23 tests.
- `conftest.py` used `os.environ.setdefault`, so a developer with real
  credentials exported would have run the suite **against production**.
- Coverage floor 60 → 72 (it sat 10 points below actual, so it could never
  fire), plus a targeted CI gate on the auth surface.

### Documentation
- `docs/audit-2026-09-06.md` — both multi-agent audit rounds, including four
  regressions the first round introduced and three briefed premises that were
  refuted on investigation.

### Fixed
- Production white-screen crash: the `mui`/`@emotion` Rollup manual
  chunk had a circular chunk dependency causing `Cannot access 'qt'
  before initialization` at load time, blanking the entire page for
  every visitor. Merged that chunk back into `vendor`.
- Flaky test `test_hashed_assets_are_immutable_and_gzipped`: picked an
  arbitrary (unsorted) built JS file that could fall under GZipMiddleware's
  1KB compression threshold. Now picks the largest chunk.

### Added
- Terraform-managed infrastructure on GCP: Cloud Run, Artifact Registry,
  Secret Manager, Workload Identity Federation for keyless GitHub Actions
  deploys, remote state in GCS.
- Cloud Monitoring uptime check on `/api/health` + email alert policy.
- CI: coverage gates (vitest + pytest, modest floors below current
  numbers), Trivy image vulnerability scanning (fails on fixable
  CRITICAL/HIGH CVEs), a read-only `terraform plan` job on PRs touching
  `infra/**`, and a Playwright E2E smoke test against the built image.
- Deploy pipeline now deploys new revisions with zero traffic, verifies
  the tagged revision directly, and only promotes to 100% traffic if
  healthy — a broken image is never live.
- `requirements.lock.txt`: hash-pinned dependencies so the production
  Docker image installs reproducibly (`pip install --require-hashes`).
- Branch protection on `main` requiring the 4 CI checks.
- `docs/adr/`: architecture decision records for the WebSocket chat
  transport, Supabase, Cloud Run, and the deploy-verify-promote pattern.

### Changed
- Production base image `python:3.12.3-slim` → `python:3.12-slim` (patch
  version unpinned to track Debian's security-patched slim builds) plus
  pinned `setuptools`/`wheel` versions, closing several fixable CVEs.

## 2026-07-08 — Modernization

Claude Haiku 4.5 assistant with conversation memory, prompt caching, and
tool-calling (site navigation, resume download, contact-form prefill);
command palette; interactive doodle canvas with party mode; project/skill/
experience detail modals with shareable deep links; cookie consent;
backend pytest suite; structured JSON logging with request IDs; CSP and
other security headers; optimized images (11 MB → 1.1 MB); initial
Terraform IaC and CI/CD pipeline. See `ROADMAP.md` for the full list.
