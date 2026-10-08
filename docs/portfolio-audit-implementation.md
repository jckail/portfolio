# October 8 portfolio audit implementation

Tracked in JCK-201. Source branch: `codex/portfolio-audit-improvements`.

## Scope

Shorter recruiter introduction, projects before the career timeline, four readable skill groups with an expandable catalogue, public OpenDataCenter/Kefi/JobDog entries and the current Jobbr URL. Each project has maturity, contribution and evidence fields. The translucent scroll rail shares the section store with the drawer; delayed initial deep links must not override visitor navigation. Brand assets and usage guidance live at `/brand-kit.html` and `docs/brand-kit.md`.

Contact and agent confirmations require visitor-entered email and company. The old email-only phone endpoint returns 410; phone disclosure follows successful message delivery. Editable introductions use reviewed templates without a paid model call. Deferred calendar tools are excluded from the SDK registry and blocked in dispatch. Calendar remains a future separately scoped integration.

Every model attempt reserves a conservative token estimate through atomic, service-only Supabase functions. Global and hashed-receipt daily caps survive process restarts and multiple instances. Settlements are idempotent; missing usage retains the estimate; accounting failures block inference. This is token admission, not a dollar-exact billing cap. The applied migration's reservation/denial/idempotent-settlement check ran inside a rolled-back transaction. Both budget tables have RLS and no anonymous or authenticated SELECT privileges. See `docs/portfolio-privacy.md` for transcript retention and rollout grace.

## Performance acceptance

Lighthouse covers both `/` and `/agent`, with blocking byte, CLS, TBT, performance, accessibility and best-practice budgets. Home SEO is blocking; the agent utility route is intentionally noindex and has no SEO-score gate. LCP has a measured regression ceiling of 3.5 seconds; the desired 2.5-second target is not yet achieved. Local initial measurements: homepage performance 92–93, accessibility/best-practices/SEO 100, LCP 2.90–3.04s, CLS 0. Agent performance 93, LCP 3.08–3.10s. The run exposed an invalid ARIA label on the evidence container, corrected before release. Local dummy credentials deliberately cannot issue trial receipts; live agent acceptance is a separate release check.

## Operational boundaries

See `docs/dependency-hygiene-2026-10-08.md` for patched tooling and remaining unpatched development-only advisory families. Terraform source no longer manages secret payloads and supports numeric version references. Formatting and validation do not migrate existing state or rotate credentials. No Terraform plan/apply was run; historical state cleanup, IAM review and remaining runtime secret pins remain owner operations documented in `infra/README.md`. The deployment workflow pins its access-signing version and only publishes the convenience latest tag after verified promotion.

Release and live acceptance receipts belong in the PR and JCK-201; local tests alone do not establish deployment.
