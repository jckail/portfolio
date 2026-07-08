# Roadmap

Planned improvements for the portfolio, grouped by theme and ordered by
priority within each section. Items marked **P0** are the highest-leverage
next steps; **P1** items are valuable but less urgent; **P2** items are
nice-to-haves or larger explorations.

For context, the current baseline (see the modernization PR) already includes:
Claude Haiku 4.5 assistant with conversation memory and prompt caching, a
backend pytest suite, gzip + cache + security headers, optimized images
(11 MB → 1.1 MB), Terraform IaC with Workload Identity Federation, and a
CI/CD pipeline that deploys to Cloud Run on merge to `main`.

---

## 1. Testing & code quality

- ~~**P0 — Frontend test coverage.**~~ Done: `useChat` (WebSocket lifecycle,
  chunk streaming, queueing, malformed frames), `useSkill` (deep links,
  back/forward), and `analytics` (session ids, page-view hash dedup) are
  covered — 25 tests total.
- ~~**P0 — Chat WebSocket integration test.**~~ Done: six
  `TestClient.websocket_connect` tests exercise the full frame protocol
  (context → message → streamed chunks → completion frame), history,
  size/rate limits, and error recovery with a mocked Anthropic client.
- **P1 — Coverage gates.** Wire `vitest --coverage` and `pytest --cov` into
  CI with modest thresholds that ratchet up as coverage grows.
- **P1 — Python lint/format.** Add `ruff` (lint + format) to
  `requirements-dev.txt` and CI. The codebase currently has no Python
  linter, so start with a lenient rule set and tighten over time.
- ~~**P1 — Strict frontend lint in CI.**~~ Done: all warnings fixed, the
  a11y/`any` rules are errors again, and `npm run lint` enforces
  `--max-warnings 0` in CI.
- **P2 — End-to-end smoke test.** A single Playwright test (page loads,
  sections render, chat opens) run against the built Docker image in CI
  would catch integration regressions that unit tests cannot.

## 2. AI assistant

- ~~**P0 — Graceful degradation.**~~ Done: `GET /api/chat/status` reports
  availability and the frontend hides the chat button when the assistant
  is not configured.
- **P1 — Markdown rendering.** Assistant replies render as plain text;
  streaming markdown (bold, lists, links) would materially improve
  readability. Use a lightweight renderer to keep the lazily-loaded chat
  chunk small, and sanitize output.
- **P1 — Conversation persistence.** History currently lives on the
  WebSocket connection and dies with it. Persist the transcript in
  `sessionStorage` and replay it on reconnect so page reloads don't reset
  the conversation.
- **P1 — Suggested prompts.** Seed the empty chat state with 3–4 clickable
  questions ("What did Jordan do at Meta?", "Summarize his AI experience")
  to reduce the blank-page problem.
- **P2 — Usage telemetry.** Log token counts and cache-hit rates from the
  Anthropic responses (already available in the stream events) to Supabase
  so cost and cache effectiveness are observable.
- **P2 — Tool use.** Let the assistant call structured tools (e.g. "open
  the Experience section", "download the resume") instead of only
  answering in text.

## 3. Frontend performance & UX

- ~~**P0 — Accessibility pass.**~~ Done: all interactive spans/divs are
  keyboard-operable (`role`, `tabIndex`, Enter/Space), modals close on
  Escape and carry `role="dialog"`/`aria-modal`, and the `jsx-a11y` rules
  are errors again. Remaining follow-up: focus trapping inside open modals.
- **P1 — Respect `prefers-reduced-motion`.** The tsparticles background
  animates unconditionally; disable or simplify it for users who request
  reduced motion, and consider pausing it when the tab is hidden (it
  currently burns CPU in background tabs).
- **P1 — LCP optimization.** Preload the headshot WebP (`<link rel="preload"
  as="image">`) and add explicit `width`/`height` to prevent layout shift.
  Audit with Lighthouse in CI (e.g. `lighthouse-ci` with budget assertions).
- **P2 — Responsive images.** Serve the headshot and any future photos with
  `srcset` variants so small screens download smaller files.
- **P2 — PWA.** Add a service worker for offline shell caching and an
  install prompt; the `site.webmanifest` already exists.

## 4. Backend & platform

- **P1 — Structured logging with request IDs.** Logs are plain strings
  today. Emit JSON logs with a per-request correlation ID (middleware) so
  Cloud Logging can filter by request; keep the Supabase sink for the
  admin dashboard.
- **P1 — Reproducible Python builds.** `requirements.txt` pins direct
  dependencies but not transitives. Adopt a lockfile (`uv` or `pip-tools`)
  so Docker builds are reproducible and Dependabot updates are reviewable.
- **P1 — Content Security Policy.** The remaining major security header.
  Needs care: the GA inline snippet requires a nonce or moving the config
  to an external file, and Google Fonts/GA endpoints must be allowlisted.
- **P2 — OpenTelemetry.** Export traces and latency metrics to Cloud
  Trace/Monitoring; the FastAPI + Cloud Run integration is well supported
  and would make chat latency and Supabase call times visible.
- **P2 — Persist chat transcripts per session.** Chat messages are stored
  in Supabase flat; group them by session ID so the admin dashboard can
  reconstruct conversations.

## 5. Infrastructure & CI/CD

- **P0 — Terraform remote state.** State is local-only, which blocks the
  planned CI plan/apply and risks loss. Create a GCS bucket, enable the
  `backend "gcs"` block in `versions.tf`, and document migration.
- **P0 — Terraform plan on PRs.** Once remote state exists, add a CI job
  that runs `terraform plan` on PRs touching `infra/` (read-only WIF role)
  and posts the plan as a PR comment.
- **P1 — Monitoring and alerting.** Add a Cloud Monitoring uptime check on
  `/api/health` with an email/Slack alert policy, managed in Terraform.
  Currently a production outage is only discovered manually.
- **P1 — Canary/rollback strategy.** Cloud Run supports traffic splitting;
  deploy new revisions at a small traffic percentage, promote on healthy
  metrics, and document one-command rollback (`gcloud run services
  update-traffic`).
- **P1 — Image vulnerability scanning.** Enable Artifact Registry scanning
  in Terraform and add a Trivy job to CI that fails on critical CVEs in
  the built image.
- **P2 — Staging environment.** A second Cloud Run service (deployed from
  PRs or a `staging` branch) for verifying changes against real Supabase/
  Anthropic credentials before production.
- **P2 — CDN for static assets.** Static files are served by FastAPI from
  the container. Fronting the service with a global external load balancer
  + Cloud CDN (or hosting `dist/` on Cloud Storage/Firebase Hosting) would
  cut static latency worldwide; the immutable cache headers added recently
  make assets CDN-ready.

## 6. Content & documentation

- **P1 — Architecture diagram.** A single diagram (frontend → FastAPI →
  Supabase/Anthropic/SendGrid, plus the deploy pipeline) in the root README.
- **P2 — ADRs.** Record decisions (WebSockets vs SSE for chat, Supabase,
  Cloud Run) as lightweight Architecture Decision Records in `docs/`.
- **P2 — Changelog.** Adopt a `CHANGELOG.md` maintained per release once
  the deploy pipeline is in regular use.

---

## Suggested sequencing

1. **Foundation:** Terraform remote state + PR plans, uptime alerting, and
   the frontend/WebSocket tests — these protect everything that follows.
2. **User-facing polish:** accessibility fixes, assistant markdown +
   persistence + suggested prompts, LCP/reduced-motion work.
3. **Platform maturity:** structured logging, lockfile builds, CSP, canary
   deploys, vulnerability scanning.
4. **Bigger bets:** staging environment, CDN, OpenTelemetry, PWA, assistant
   tool use.
