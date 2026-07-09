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
- ~~**P1 — Python lint/format.**~~ Done: `ruff` runs in CI with
  pycodestyle/pyflakes/bugbear/pyupgrade/async rules; its first pass caught
  a latent `NameError` and blocking I/O in async handlers.
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
- ~~**P1 — Markdown rendering.**~~ Done: lightweight `ChatMarkdown` renderer
  (bold, italic, lists, links, fenced code) with React-escaped text and
  http(s)/mailto-only links — no `dangerouslySetInnerHTML`, no extra deps.
- ~~**P1 — Conversation persistence.**~~ Done: completed messages are saved
  to `sessionStorage` and restored on reload within the same tab session.
- ~~**P1 — Suggested prompts.**~~ Done: four clickable starter questions
  appear until the visitor sends their first message.
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
- ~~**P1 — Respect `prefers-reduced-motion`.**~~ Done: the particle canvas
  is skipped entirely for reduced-motion users and a global CSS rule
  collapses animations/transitions; tsparticles pauses on hidden tabs by
  default (`pauseOnBlur`).
- **P1 — LCP optimization.** Headshot WebP is now preloaded with explicit
  dimensions. Remaining: audit with Lighthouse in CI (e.g. `lighthouse-ci`
  with budget assertions).
- **P2 — Responsive images.** Serve the headshot and any future photos with
  `srcset` variants so small screens download smaller files.
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
- **P1 — Reproducible Python builds.** `requirements.txt` pins direct
  dependencies but not transitives. Adopt a lockfile (`uv` or `pip-tools`)
  so Docker builds are reproducible and Dependabot updates are reviewable.
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

- ~~**P1 — Architecture diagram.**~~ Done: mermaid diagram in the root README
  covering SPA → FastAPI → Claude/Supabase/SendGrid and the deploy path.
- **P2 — ADRs.** Record decisions (WebSockets vs SSE for chat, Supabase,
  Cloud Run) as lightweight Architecture Decision Records in `docs/`.
- **P2 — Changelog.** Adopt a `CHANGELOG.md` maintained per release once
  the deploy pipeline is in regular use.

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

1. **Foundation:** Terraform remote state + PR plans, uptime alerting —
   these protect everything that follows (needs GCP owner setup).
2. **User-facing polish:** assistant UX, project modals, skills search,
   About CTA, chat navigation tools, doodle canvas, cookie consent, focus
   trap, keyboard shortcuts — largely done on this branch.
3. **Platform maturity:** lockfile builds, CSP, canary deploys,
   vulnerability scanning, coverage gates, architecture diagram.
4. **Bigger bets:** staging environment, CDN, OpenTelemetry, PWA offline
   shell, richer assistant tool use (e.g. fill contact form).
