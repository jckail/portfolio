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
- ~~**P1 — Coverage gates.**~~ Done: CI runs `vitest run --coverage`
  (12%/45%/20%/12% stmts/branches/funcs/lines, `all: true` so untested
  files count as 0%) and `pytest --cov` (60% floor); both are modest
  floors below current numbers meant to ratchet up over time.
- ~~**P1 — Python lint/format.**~~ Done: `ruff` runs in CI with
  pycodestyle/pyflakes/bugbear/pyupgrade/async rules; its first pass caught
  a latent `NameError` and blocking I/O in async handlers.
- ~~**P1 — Strict frontend lint in CI.**~~ Done: all warnings fixed, the
  a11y/`any` rules are errors again, and `npm run lint` enforces
  `--max-warnings 0` in CI.
- ~~**P2 — End-to-end smoke test.**~~ Done: `e2e/` Playwright project
  boots the CI-built image with dummy credentials and checks page load,
  section rendering, and the chat panel opening — runs as steps in the
  `docker` CI job so a failure already blocks merges.

## 2. AI assistant

- ~~**P0 — Graceful degradation.**~~ Done: `GET /api/chat/status` reports
  availability and the frontend hides the chat button when the assistant
  is not configured.
- ~~**P1 — Markdown rendering.**~~ Done: lightweight `ChatMarkdown` renderer
  (bold, italic, lists, links, fenced code) with React-escaped text and
  http(s)/mailto-only links — no `dangerouslySetInnerHTML`, no extra deps.
- ~~**P1 — Conversation persistence.**~~ Done: completed messages are saved
  to `sessionStorage` and restored on reload within the same tab session.
- ~~**P1 — Suggested prompts.**~~ Done: four clickable starter questions
  appear until the visitor sends their first message.
- ~~**P2 — Usage telemetry.**~~ Done: token counts and cache hit/creation
  counts logged to Supabase's existing `logs` table (`session_uuid` =
  `client_id`, `source="chat"`, counts in `metadata`) after each response
  — no schema change needed, reused the flexible metadata column instead
  of a new table.
- ~~**P2 — Tool use.**~~ Done, see §7 "Chat site-navigation actions."

## 3. Frontend performance & UX

- ~~**P0 — Accessibility pass.**~~ Done: all interactive spans/divs are
  keyboard-operable (`role`, `tabIndex`, Enter/Space), modals close on
  Escape and carry `role="dialog"`/`aria-modal`, and the `jsx-a11y` rules
  are errors again. Focus trapping inside open modals now done too (see
  §7).
- ~~**P1 — Respect `prefers-reduced-motion`.**~~ Done: the particle canvas
  is skipped entirely for reduced-motion users and a global CSS rule
  collapses animations/transitions; tsparticles pauses on hidden tabs by
  default (`pauseOnBlur`).
- ~~**P1 — LCP optimization.**~~ Done: headshot WebP preloaded with
  explicit dimensions, plus `@lhci/cli` resource-size budget assertions
  (script/stylesheet/image/total transfer size) in CI, set with headroom
  above measured values rather than tight thresholds — timing-based
  Lighthouse metrics are too CI-noisy to gate on reliably, byte budgets
  aren't.
- ~~**P2 — Responsive images.**~~ Done: headshot serves 1x/2x/3x density
  variants (`buildHeadshotSrcSet`), 1x is 7.6KB vs 32KB for the original
  — a real win since the display size is a fixed 200×200px, not
  viewport-responsive, so density (not breakpoint) srcset is the right
  fit. The `index.html` LCP preload mirrors the same variants.
- **P2 — PWA.** Add a service worker for offline shell caching and an
  install prompt; the `site.webmanifest` already exists.

## 4. Backend & platform

- ~~**P1 — Structured logging with request IDs.**~~ Done: JSON stdout/file
  logs via `JsonFormatter`, per-request `X-Request-ID` middleware
  (honors inbound header), and `request_id` attached to Supabase log
  metadata.
- ~~**P1 — Content Security Policy.**~~ Done: CSP header allowlists self,
  Google Fonts, and GA; inline GA bootstrap kept with `'unsafe-inline'`
  (nonce migration left as a follow-up).
- ~~**P1 — Reproducible Python builds.**~~ Done: `requirements.lock.txt`
  (hash-pinned, `pip-tools`) is what the production Docker image actually
  installs (`pip install --require-hashes`); regenerate with
  `helpers/compile-requirements.sh` after editing `requirements.txt`.
- **P2 — OpenTelemetry.** Export traces and latency metrics to Cloud
  Trace/Monitoring; the FastAPI + Cloud Run integration is well supported
  and would make chat latency and Supabase call times visible.
- **P2 — Persist chat transcripts per session.** Chat messages are stored
  in Supabase flat; group them by session ID so the admin dashboard can
  reconstruct conversations.

## 5. Infrastructure & CI/CD

- ~~**P0 — Terraform remote state.**~~ Done: state lives in
  `gs://portfolio-383615-terraform-state`, `backend "gcs"` enabled in
  `versions.tf`.
- ~~**P0 — Terraform plan on PRs.**~~ Done: `.github/workflows/terraform-plan.yml`
  runs a read-only `terraform plan` (dedicated `quickresume-planner`
  service account, `roles/viewer` + state-bucket access only) on PRs
  touching `infra/**` and posts the plan to the job summary.
- ~~**P1 — Monitoring and alerting.**~~ Done: Cloud Monitoring uptime check
  on `/api/health` (5 min interval) + alert policy emailing `admin_email`,
  managed in `infra/monitoring.tf`.
- ~~**P1 — Canary/rollback strategy.**~~ Done: `deploy.yml` deploys the new
  revision with `--no-traffic --tag=gh-<sha>`, health-checks that
  revision's own URL directly, and only then runs `update-traffic
  --to-latest` — a broken image is never live. Verified end-to-end via
  manual dispatch against the real service before merging. Rollback
  documented in `HANDOFF.md`.
- ~~**P1 — Image vulnerability scanning.**~~ Done: CI builds the production
  image and runs `aquasecurity/trivy-action`, failing on fixable
  CRITICAL/HIGH CVEs (`ignore-unfixed: true`). Required bumping the base
  image (`python:3.12.3-slim` → `python:3.12-slim`) and pinning
  setuptools/wheel to close pre-existing CVEs in the old baseline.
  Artifact Registry's built-in scanning not separately enabled — Trivy in
  CI covers the same need pre-merge.
- **P2 — Staging environment.** A second Cloud Run service (deployed from
  PRs or a `staging` branch) for verifying changes against real Supabase/
  Anthropic credentials before production.
- **P2 — CDN for static assets.** Static files are served by FastAPI from
  the container. Fronting the service with a global external load balancer
  + Cloud CDN (or hosting `dist/` on Cloud Storage/Firebase Hosting) would
  cut static latency worldwide; the immutable cache headers added recently
  make assets CDN-ready.

## 6. Content & documentation

- ~~**P1 — Architecture diagram.**~~ Done: mermaid diagram in the root README
  covering SPA → FastAPI → Claude/Supabase/SendGrid and the deploy path.
- ~~**P2 — ADRs.**~~ Done: `docs/adr/` covers WebSockets vs SSE for chat,
  Supabase, Cloud Run, and the deploy-verify-promote pattern.
- ~~**P2 — Changelog.**~~ Done: `CHANGELOG.md`, grouped by date rather
  than version tags since this project doesn't cut releases.

## 7. Visitor-facing product features

- ~~**P1 — Project detail modals + deep links.**~~ Done: cards open a modal
  with `description_detail`, tech stack, and last-updated date; shareable
  via `?project=`.
- ~~**P1 — Skills search & category filter.**~~ Done: search input +
  category chips above the skills grid.
- ~~**P1 — Richer About hero + recruiter CTA.**~~ Done: brief bio,
  primary-skill icons, and an "Open to … / Get in touch" strip driven by
  `aboutme.json` → `open_to`.
- ~~**P1 — Copy-link on modals.**~~ Done: experience, skill, and project
  modals expose a one-click shareable deep link.
- ~~**P1 — Social preview + PWA manifest names.**~~ Done: `og:image` /
  Twitter card meta and filled `site.webmanifest` name fields.
- ~~**P1 — Chat site-navigation actions.**~~ Done: Claude can call
  `navigate_section` / `open_modal` / `download_resume` tools; the backend
  forwards validated `{type:"action"}` frames and the frontend executes them.
- ~~**P1 — Focus trap in modals.**~~ Done: `useFocusTrap` on experience,
  skill, project, and contact dialogs.
- ~~**P1 — Interactive doodle canvas.**~~ Done: pointer-drawing canvas with
  clear control; party mode adds colorful glow strokes.
- ~~**P1 — Cookie consent banner.**~~ Done: consent-mode defaults to denied;
  banner gates analytics until accept/deny; choice persisted in localStorage.
- ~~**P2 — Keyboard shortcuts.**~~ Done: `?`/`/` opens chat; `g` then
  `a/e/p/s/r` jumps to About/Experience/Projects/Skills/Resume.
- ~~**P2 — Command palette.**~~ Done: `Ctrl/Cmd+K` fuzzy jump to sections,
  chat, contact, resume download, and party mode.
- ~~**P2 — Konami / party URL eggs.**~~ Done: ↑↑↓↓←→←→BA and `?party=1`
  activate party mode with a burst animation.
- ~~**P2 — Chat contact prefill.**~~ Done: `prefill_contact` tool drafts
  the contact form from conversation context.
- ~~**P2 — Project story timeline.**~~ Done: project modals show Snapshot /
  Story / Stack / Updated steps when detail data exists.
- ~~**P2 — Reading progress bar.**~~ Done: thin top-of-viewport scroll
  indicator.

---

## Suggested sequencing

1. ~~**Foundation:** Terraform remote state + PR plans, uptime alerting.~~ Done.
2. ~~**User-facing polish:** assistant UX, project modals, skills search,
   About CTA, chat navigation tools, doodle canvas, cookie consent, focus
   trap, keyboard shortcuts.~~ Done.
3. ~~**Platform maturity:** coverage gates, image vulnerability scanning,
   reproducible Python builds, canary deploys, E2E smoke test, ADRs,
   changelog.~~ Done.
4. **Bigger bets (current focus):** staging environment, CDN,
   OpenTelemetry, PWA offline shell, usage telemetry, Lighthouse CI
   budgets, responsive images, persisted chat transcripts per session.
