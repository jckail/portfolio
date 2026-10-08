# October 8 portfolio audit implementation

Tracked in JCK-201. Source branch: `codex/portfolio-audit-improvements`.

## Scope

Shorter recruiter introduction, projects before the career timeline, four readable skill groups with an expandable catalogue, public OpenDataCenter/Kefi/JobDog entries and the current Jobbr URL. Each project has maturity, contribution and evidence fields. The translucent scroll rail shares the section store with the drawer; delayed initial deep links must not override visitor navigation. Brand assets and usage guidance live at `/brand-kit.html` and `docs/brand-kit.md`.

Contact and agent confirmations require visitor-entered email and company. The old email-only phone endpoint returns 410; phone disclosure follows successful message delivery. Editable introductions use reviewed templates without a paid model call. Deferred calendar tools are excluded from the SDK registry and blocked in dispatch. Calendar remains a future separately scoped integration.

Every model attempt reserves a conservative token estimate through atomic, service-only Supabase functions. Global and hashed-receipt daily caps survive process restarts and multiple instances. Defaults are 2,000,000 global and 500,000 per-receipt tokens per UTC day. The receipt allowance is tested against the actual prompt and three-attempt provider failover. Settlements are idempotent; missing usage or settlement outage retains the estimate without invalidating a completed reply; admission failures block inference. This is token admission, not a dollar-exact billing cap. The applied migration's reservation/denial/idempotent-settlement check ran inside a rolled-back transaction. Both budget tables have RLS and no anonymous or authenticated SELECT privileges. See `docs/portfolio-privacy.md` for transcript retention and rollout grace.

## Performance acceptance

Lighthouse covers both `/` and `/agent`, with blocking byte, CLS, TBT, performance, accessibility and best-practice budgets. Home SEO is blocking; the agent utility route is intentionally noindex and has no SEO-score gate. LCP has a measured regression ceiling of 3.5 seconds; the desired 2.5-second target is not yet achieved. Local initial measurements: homepage performance 92–93, accessibility/best-practices/SEO 100, LCP 2.90–3.04s, CLS 0. Agent performance 93, LCP 3.08–3.10s. The run exposed an invalid ARIA label on the evidence container, corrected before release. Local dummy credentials deliberately cannot issue trial receipts; live agent acceptance is a separate release check.

## Operational boundaries

See `docs/dependency-hygiene-2026-10-08.md` for patched tooling and remaining unpatched development-only advisory families. Terraform source no longer manages secret payloads and supports numeric version references. Formatting and validation do not migrate existing state or rotate credentials. No Terraform plan/apply was run; historical state cleanup, IAM review and remaining runtime secret pins remain owner operations documented in `infra/README.md`. The deployment workflow pins its access-signing version and only publishes the convenience latest tag after verified promotion.

Release and live acceptance receipts belong in the PR and JCK-201; local tests alone do not establish deployment.


## Case studies, timeline and brand follow-on

The second phase adds exactly three structured featured cases (Portfolio Agent Platform, PointUp, Data Playground), six catalogue filters and twelve verified public entries. Unknown private systems were investigated but withheld from publication. The same registry exports case studies through JSON/MCP and bounded GraphQL. Detailed narratives are searched on demand instead of inflating every initial agent prompt. Current source descriptions and the generated résumé supersede stale goPilot, PointUp and AI Billing descriptions.

One frosted navigation rail now combines page sections with company/date reading anchors. IntersectionObserver selects the largest visible company in a height-based reading band; native fragment navigation preserves deliberate jumps and Back/Forward. Reduced-motion/transparency rules, inert hidden controls and native mobile selectors are covered by focused checks. The brand-kit route uses shared React primitives, actual case-study rendering and semantic tokens. Four editable 1200x630 SVG templates preserve existing raster social metadata. Independent products keep their identities.

Verified locally before review: 743 frontend tests with coverage, lint/typecheck/build; 1,342 backend tests (4 skips, one live deselection) at 94.67% coverage; all 78 browser checks without retries. These include contact recovery, text entry, trial boundaries, modals, catalogue filtering/deep links, themed desktop/mobile milestone jumps and Back/Forward. A WSL restart stopped a later Lighthouse attempt; its connection/interstitial failure was environmental. Restored the isolated dummy-credential server and completed all nine measurements below. No live credentials were used in the local suite.

Lighthouse follow-on measurements (three runs per route):

| Route | Performance | Accessibility | Best practices | SEO | LCP | CLS | Transfer |
|---|---|---|---|---|---|---|---|
| Home | 89–91 | 100 | 100 | 100 | 3.05–3.35s | at most 0.00012 | 320–561KB |
| Agent | 92–93 | 100 | 96 | 66 | 3.07–3.09s | 0 | 271KB |
| Brand kit | 97–98 | 100 | 100 | 69 | 2.30–2.32s | 0 | 202KB |

All configured gates passed. Agent/brand utility pages are intentionally noindex; their SEO score is not a search-landing-page gate. Agent best-practices result reflects the isolated local receipt service rejecting dummy credentials. The desired homepage LCP 2.5s target remains open; no real-user p75 LCP/INP claim is made. Resource and layout budgets remain enforced in CI. Reports are reproducible through e2e/lighthouserc.json; temporary logs from before WSL restart were lost, while executed tool receipts and tracked test source remain.

Live first-release acceptance: PR115 merge a0844ab0cac280b377b1e86317c887d6cc14d7f3, Deploy run 37853050843, Cloud Run quickresume-00492-deg at 100% traffic. All four origins reported that SHA and healthy status. Contact text fields accepted synthetic text. One explicitly owner-authorized delivery test arrived from assistant@jordankail.ai in the owner inbox, and the UI disclosed the phone link only after success. The follow-on catalogue/timeline/brand changes still require their own exact-SHA release acceptance.

Database concurrency evidence: four concurrent synthetic reservations of three tokens against a nine-token receipt allowance admitted exactly three and denied one. An independent query observed nine persisted tokens. Successful zero-usage settlement and narrowly scoped cleanup removed only synthetic test records; no model calls or messages were made by this database test.
