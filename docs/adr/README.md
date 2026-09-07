# Architecture Decision Records

Lightweight records of decisions worth remembering the *why* behind, not
just the *what* (the code already shows the what). New ADRs: copy the
format below, number sequentially, keep it to half a page.

| ADR | Title |
|---|---|
| [0001](0001-websockets-for-chat.md) | WebSockets (not SSE) for the chat assistant |
| [0002](0002-supabase-for-data-and-auth.md) | Supabase for data, auth, and chat logging |
| [0003](0003-cloud-run-for-hosting.md) | Cloud Run over GKE/App Engine for hosting |
| [0004](0004-deploy-verify-before-promote.md) | Deploy with zero traffic, verify, then promote |


## Related reviews

Not ADRs, but the reasoning behind several recent changes lives here:

- [`../audit-2026-09-06.md`](../audit-2026-09-06.md) — two multi-agent audit
  rounds; regressions the first round introduced, and why the tests missed them.
- [`../audit-2026-09-06-open-findings.md`](../audit-2026-09-06-open-findings.md)
  — the open backlog from those rounds.
- [`../security-review-2026-09-05.md`](../security-review-2026-09-05.md) —
  cloud/CI trust boundary review.
