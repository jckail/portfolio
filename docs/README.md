# Documentation index

Everything under `docs/`, grouped. Start with the root [README](../README.md)
for orientation; source and tests win when a document and the code disagree
(see "What to trust" in [AGENTS.md](../AGENTS.md)).

## Current guides

- [overview.md](./overview.md) — full feature list, technology stack, detailed layout and architecture diagram
- [portfolio-assistant-runtime.md](./portfolio-assistant-runtime.md) — the `/agent` page and chat pane: access gating, tools, calendar, acceptance
- [apps.md](./apps.md) — how other projects reach `jckail.com/<slug>` as hosted demos or forwards; slug rules and checklist
- [labs.md](./labs.md) — the hosted labs and forwards platform
- [apps/](./apps) — per-demo notes: [aibilling](./apps/aibilling.md), [cryptotrader](./apps/cryptotrader.md), [gopilot](./apps/gopilot.md), [jobbr](./apps/jobbr.md)
- [dataplayground.md](./dataplayground.md) — Data Playground integration
- [data-operations-design.md](./data-operations-design.md) — Data Playground operations workbench design
- [sabbatical-photos.md](./sabbatical-photos.md) — adding photos to the Sabbatical entry

## Operations and hosting

- [gcp-project-hosting.md](./gcp-project-hosting.md) — GCP project hosting and release runbook
- [host-canonicalization-decision.md](./host-canonicalization-decision.md) — open decision memo on canonical host redirects (audit I-9)
- Outside `docs/`: [DEPLOYMENT.md](../DEPLOYMENT.md), [HANDOFF.md](../HANDOFF.md), [infra/README.md](../infra/README.md), [helpers/README.md](../helpers/README.md)

## Decisions

- [adr/](./adr/README.md) — architecture decision records 0001-0007

## Dated reviews and audits

Point-in-time records; they are not updated as the code changes.

- [security-review-2026-09-05.md](./security-review-2026-09-05.md) — repository and cloud security review
- [audit-2026-09-06.md](./audit-2026-09-06.md) and [audit-2026-09-06-open-findings.md](./audit-2026-09-06-open-findings.md) — multi-agent audit and its open backlog
- [portfolio-recruiter-audit-2026-10-06.md](./portfolio-recruiter-audit-2026-10-06.md) — recruiter-perspective research for the assistant overhaul
- [superdesign/portfolio-ux-fixes.md](./superdesign/portfolio-ux-fixes.md) — UX audit corrections

## Per-package documentation

- [frontend/README.md](../frontend/README.md), [backend/README.md](../backend/README.md), [copilot/README.md](../copilot/README.md)
