# Portfolio assistant runtime and acceptance

The dedicated `/agent?theme=dark` page is the primary assistant surface. A visitor enters email and company; the server notifies the configured owner inbox and then issues an eight-hour access receipt. Entry information is self-reported, not verified employment or email ownership. Receipts carry no email/company and must be sent as the first WebSocket frame, never in a URL. Model messages, transcript replay and actions are refused without valid access when `AGENT_ACCESS_REQUIRED=true` (the default).

OpenAI Agents SDK 0.23.1 runs actual `Agent`, `Runner` and `FunctionTool` orchestration. `PortfolioModel` bridges the existing Vertex/Anthropic provider, preserving fallback and streaming. This does not switch models to OpenAI. Tracing is disabled. Read tools use published portfolio data; retrieved briefs, projects, role evidence, contact options and calendar availability generate typed UI cards. Generated HTML and arbitrary web/code tools are excluded.

Contact and calendar tools only propose reviewed cards. Visitor confirmation is the authority for execution. Calendar booking requires a recently returned server slot, preserves its start time, validates email/topic/company, rechecks free/busy and verifies Google's returned event before reporting creation. A created invitation does not mean Jordan personally accepted it. Google has no atomic free/busy plus insert transaction; external edits can race the last check. Slot-derived event IDs prevent duplicate exact-slot inserts by this application.

## Access configuration

`AGENT_ACCESS_SECRET` is a dedicated random signing secret of at least 32 characters, provisioned in Secret Manager as `portfolio-agent-access`, version 1, and with a secret-accessor binding for the Cloud Run runtime account. Contents must never be committed, logged or copied into Terraform state. Deploy binds the secret when staging the new immutable revision. The owner inbox must match the user-selected address; notification failure grants no access. Requests are limited to 3 per IP per hour and 60 per instance per hour. Existing limits are per instance, not a durable service-wide spending ledger.

## Calendar connection

The deployed application needs its own Google OAuth client and refresh token; the Codex Calendar connector is not application authorization. Use an isolated portfolio OAuth client, not another project's client. Required scopes are `calendar.events.owned` and `calendar.events.freebusy` for the owner's calendar. Store runtime values securely as `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `GOOGLE_CALENDAR_REFRESH_TOKEN` and `GOOGLE_CALENDAR_ID`. Enable the Calendar API in the portfolio Cloud project.

`CALENDAR_BOOKING_ENABLED` and `CALENDAR_POLICY_CONFIRMED` both default to false. Until credentials and the owner's schedule are configured, the tool returns unavailable and offers a reviewed meeting request. Jordan approved the proposed policy on October 7: 30 minutes, weekdays 9–17 in America/Los_Angeles, 24 hours notice and a 21-day horizon. Live availability still depends on the connected calendar and both runtime enablement flags. Settings allow timezone/start/end hour configuration.

Google OAuth creation/consent through browser UI requires action-time confirmation for new sensitive access. Prepare and review the exact calendar permissions before approval. Do not create disposable calendar events or send real mail as tests without explicit authorization.

## Verification required before completion

- Gate: success follows notification acceptance; failure issues no receipt; invalid/tampered/expired receipts cause no model request; receipts survive instances without exposing personal details.
- Interface: dedicated route dark/light and mobile; no chat before access; expiry returns to gate; generated evidence cards show actual tool results and safe source links; contact review/edit/cancel/confirm.
- Calendar: no booking before confirmation; returned slot binding, busy recheck, duplicate/replay rejection, DST handling and sanitized failures; real OAuth connection plus verified live availability and authorized booking acceptance remain separate from mocks.
- Release: full lint/typechecks/tests/coverage/build and protected CI, immutable canary deployment, exact SHA verification across live domains. Respect the shared verification lock.

October 7 local qualification: full backend suite 1,240 passed with 95.09 percent coverage before the final route registration; all 93 SPA route tests pass after that change. Full frontend suite 651 passed with 84.28 percent statement coverage; all 13 dedicated agent tests pass after correcting evidence bullet truncation. Frontend lint, TypeScript checks and the rebuilt production bundle pass. All 53 browser tests pass against the real application with mock provider/mail boundaries, including introduction gating, first-frame access, review validation, cancel and confirm. Chrome extension verification covers dark/light and phone width without horizontal overflow. Terraform 1.9.8 fmt and validate pass; no plan/apply ran. Calendar OAuth and live release acceptance remain incomplete.

October 7 release qualification: PR #94 passed all four required hosted checks at `d58dd9a8412657c19ecc2ad6d741d2584e4f90dc`, including production dependency audits, Docker vulnerability scanning, browser smoke tests and Lighthouse assertions. The Jobbr tile and generated resume link to `https://jobdog.ai/jobbr/#/`. PR #94 merged as `14fd3bb2087c7b822dd7fb98dea3e5f36ca1ff5c`; its inherited commit message suppressed push workflows. This follow-up receipt triggers ordinary main CI and deployment after a protected merge with an explicit clean message. Merge and CI evidence do not establish production acceptance.

The isolated desktop Calendar client was created in project `portfolio-383615`, and the Calendar API was enabled. The project's shared consent brand is Jobdog and its audience remains External/Testing with no test users. Owner authorization returned `access_denied`; adding the owner as a tester and granting the reviewed Calendar scopes require action-time approval. Calendar booking remains disabled pending authorization and live availability verification. Credential values are excluded from this record.
