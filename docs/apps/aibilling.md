# /aibilling hosted demo

Interactive demo of the AI Chat Billing System (project key `ai_billing`, repo `jckail/ai_chat_billing_app`).

- Code: `frontend/src/app/labs/aibilling/` (`lab.tsx` default export, pure logic in `data.ts`, `pricing.ts`, `aggregate.ts`, `pipeline.ts`, `invoice.ts`, `rng.ts`).
- Content: `backend/app/data/labs/aibilling.json`. Intro facts come from the project README (purpose, components, 15-second dashboard refresh target).
- Synthetic only: seeded PRNG (mulberry32), 10 threads over a 24 hour day, scenarios steady / spike / runaway. No network calls, no timers.
- Model names (Small/Medium/Large) are placeholders. Only "Small" mirrors the sample `.env` default token prices ($0.00000025 in, $0.00000075 out per token); the others are arbitrary editable values.
- Pipeline view: simulated clock advanced by buttons. The 5 s batch (README `BATCH_INTERVAL_SECONDS`) and 15 s refresh values are illustrative, not measurements.
- Invoice: one line item per selected thread, CSV (formula-injection guarded) and print view, all client-side.
- Tests: `logic.test.ts`, `lab.test.tsx`, `e2e/tests/aibilling.spec.ts`.
