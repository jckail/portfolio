# Portfolio assistant runtime and acceptance

For the optional AWS SES owner-notification provider, see
[portfolio SES mail](portfolio-ses-mail.md). Production sender verification and
runtime credentials are separate from the implemented provider adapter.

The dedicated `/agent?theme=dark` page and the right-side pane share one conversation interface. The bottom-right “Chat with my Agent” launcher opens the pane. Visitors receive a two-message anonymous preview, then enter email and company to continue; the server notifies the configured owner inbox before issuing an eight-hour full-access receipt. Entry information is self-reported, not verified employment or email ownership. Receipts carry no email/company and must be sent as the first WebSocket frame, never in a URL. Model messages, transcript replay and actions are refused without a valid trial or full receipt when `AGENT_ACCESS_REQUIRED=true` (the default). Trial visitors cannot execute contact or calendar actions.

OpenAI Agents SDK 0.23.1 runs actual `Agent`, `Runner` and `FunctionTool` orchestration. `PortfolioModel` bridges the existing Vertex/Anthropic provider, preserving fallback and streaming. This does not switch models to OpenAI. Tracing is disabled. Read tools use published portfolio data; retrieved briefs, projects, role evidence, contact options and calendar availability generate typed UI cards. Generated HTML and arbitrary web/code tools are excluded.

Contact and calendar tools only propose reviewed cards. Visitor confirmation is the authority for execution. Calendar booking requires a recently returned server slot, preserves its start time, validates email/topic/company, rechecks free/busy and verifies Google's returned event before reporting creation. A created invitation does not mean Jordan personally accepted it. Google has no atomic free/busy plus insert transaction; external edits can race the last check. Slot-derived event IDs prevent duplicate exact-slot inserts by this application.

## Access configuration

`AGENT_ACCESS_SECRET` is a dedicated random signing secret of at least 32 characters, provisioned in Secret Manager as `portfolio-agent-access`, version 1, and with a secret-accessor binding for the Cloud Run runtime account. Contents must never be committed, logged or copied into Terraform state. Deploy binds the secret when staging the new immutable revision. The owner inbox must match the user-selected address; notification failure grants no access. Requests are limited to 3 per IP per hour and 60 per instance per hour. Existing limits are per instance, not a durable service-wide spending ledger.

## Anonymous preview and abuse controls

Apply `backend/migrations/20261007_agent_trials.sql` to the deployed portfolio Supabase project before releasing trial-enabled source. This additive migration creates only quota tables and service-role-only RPCs; RLS blocks public table access. `POST /api/agent/trial` issues a 24-hour signed trial receipt after durable admission. Each trial reserves at most two inference turns under a database row lock, before calling a provider. Reconnects and competing application instances consult the same row. Database failures do not fall back to an in-memory or browser counter. Reserved turns are not refunded on provider failure, to avoid retry races and repeated spending.

Admission allows one trial per HMAC address bucket per UTC day and 300 trials across the service per UTC day (at most 600 anonymous inference turns). Quota tables store no messages, email/company, or raw address. Address bucketing may group visitors on a shared network; missing/lost receipts and exhausted budgets fall back to the introduction form. Existing paid-chat rate limits still apply. These trial limits do not establish durable spending limits for introduced visitors, who retain the existing per-instance controls.

The first socket frame accepts either a full receipt or a distinct signed trial receipt. The server emits `access_status` on trial admission and after each reservation. A third message or anonymous contact confirmation receives `access_required` without inference or execution. The UI waits for the second response to finish before showing the inline introduction, retains the transcript during upgrade, and retires connection-bound confirmation cards on reconnect.

Production admission also checks purpose before inference. Obvious unrelated tasks and instruction-override requests receive a local portfolio-scope refusal without spending a trial turn. Published employer/project/technology names and relevant recruiter questions remain supported. This filter supplements the system policy, bounded SDK loop, tool allowlist, and server confirmation boundary; it does not guarantee detection of every adversarial prompt.

`helpers/verify_agent_trial_sql.py` exercises the actual migration in an isolated local PostgreSQL container, including competing turn reservations and daily peer admissions. Run through the shared heavy-check wrapper. It never connects to Supabase, sends mail, or calls a model.

## Current scheduling decision — October 8, 2026

Jordan explicitly tabled calendar integration. Google Calendar consent, credential binding, live availability, and booking are **out of scope for the current portfolio release**. Missing OAuth consent is no longer a blocker or a reason to restart authorization. Do not request consent, activate the adapter, create calendar events, or start Calendly setup until Jordan explicitly resumes this feature.

The deployed service has no Google Calendar credential bindings. `CALENDAR_BOOKING_ENABLED` and `CALENDAR_POLICY_CONFIRMED` remain false by default. The retained Google adapter and its mocked tests are a dormant prototype, not a supported live feature. The agent is instructed not to call its availability or booking tools; it offers the contact form or a visitor-reviewed meeting-request email instead. Existing contact, phone-after-send, and owner notification behavior remain available. A meeting-request email does not reserve a time or create an invitation.

**Future direction:** evaluate Calendly's API or an equivalent scheduling service when this feature is resumed. No provider, credentials, paid plan, or date is committed. Before implementing, choose the provider and integration approach, verify its current API/authentication and plan requirements, define visitor consent and privacy boundaries, and decide how cancellations and reschedules will work. Require duplicate-event protection and live end-to-end acceptance before describing any meeting as booked. Reconfirm scheduling preferences rather than treating the historical Google prototype policy as authorization for a new service.

The historical Google setup notes below are retained solely for context. They are not active setup instructions or unfinished release acceptance. Scheduling-specific tests describe prototype behavior; current release acceptance covers the portfolio agent, evidence cards, access gate/notifications, reviewed contact flow and honest deferral of direct booking.

## Deferred Calendar prototype (historical setup; do not activate)

The deployed application needs its own Google OAuth client and refresh token; the Codex Calendar connector is not application authorization. Use an isolated portfolio OAuth client, not another project's client. Required scopes are `calendar.events.owned` and `calendar.events.freebusy` for the owner's calendar. Store runtime values securely as `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `GOOGLE_CALENDAR_REFRESH_TOKEN` and `GOOGLE_CALENDAR_ID`. Enable the Calendar API in the portfolio Cloud project.

`CALENDAR_BOOKING_ENABLED` and `CALENDAR_POLICY_CONFIRMED` both default to false. Until credentials and the owner's schedule are configured, the tool returns unavailable and offers a reviewed meeting request. Jordan approved the proposed policy on October 7: 30 minutes, weekdays 9–17 in America/Los_Angeles, 24 hours notice and a 21-day horizon. Live availability still depends on the connected calendar and both runtime enablement flags. Settings allow timezone/start/end hour configuration.

Google OAuth creation/consent through browser UI requires action-time confirmation for new sensitive access. Prepare and review the exact calendar permissions before approval. Do not create disposable calendar events or send real mail as tests without explicit authorization.

## Verification required before completion

- Gate: success follows notification acceptance; failure issues no receipt; invalid/tampered/expired receipts cause no model request; receipts survive instances without exposing personal details.
- Interface: dedicated route and right-side pane in dark/light and mobile; two anonymous messages then introduction; expiry returns to gate; generated evidence cards show actual tool results and safe source links; contact review/edit/cancel/confirm.
- Calendar: no booking before confirmation; returned slot binding, busy recheck, duplicate/replay rejection, DST handling and sanitized failures; real OAuth connection plus verified live availability and authorized booking acceptance remain separate from mocks.
- Release: full lint/typechecks/tests/coverage/build and protected CI, immutable canary deployment, exact SHA verification across live domains. Respect the shared verification lock.

October 7 local qualification: full backend suite 1,240 passed with 95.09 percent coverage before the final route registration; all 93 SPA route tests pass after that change. Full frontend suite 651 passed with 84.28 percent statement coverage; all 13 dedicated agent tests pass after correcting evidence bullet truncation. Frontend lint, TypeScript checks and the rebuilt production bundle pass. All 53 browser tests pass against the real application with mock provider/mail boundaries, including introduction gating, first-frame access, review validation, cancel and confirm. Chrome extension verification covers dark/light and phone width without horizontal overflow. Terraform 1.9.8 fmt and validate pass; no plan/apply ran. Calendar OAuth and live release acceptance remain incomplete.

October 7 release qualification: PR #94 passed all four required hosted checks at `d58dd9a8412657c19ecc2ad6d741d2584e4f90dc`, including production dependency audits, Docker vulnerability scanning, browser smoke tests and Lighthouse assertions. The Jobbr tile and generated resume link to `https://jobdog.ai/jobbr/#/`. PR #94 merged as `14fd3bb2087c7b822dd7fb98dea3e5f36ca1ff5c`; its inherited commit message suppressed push workflows. This follow-up receipt triggers ordinary main CI and deployment after a protected merge with an explicit clean message. Merge and CI evidence do not establish production acceptance.

The isolated desktop Calendar client was created in project `portfolio-383615`, and the Calendar API was enabled. The project's shared consent brand is Jobdog and its audience remains External/Testing with no test users. Owner authorization returned `access_denied`; adding the owner as a tester and granting the reviewed Calendar scopes require action-time approval. Calendar booking remains disabled pending authorization and live availability verification. Credential values are excluded from this record.
