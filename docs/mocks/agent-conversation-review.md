# Portfolio conversation prototype and ElevenLabs setup

The review artifact is `docs/mocks/agent-conversation.html` on `feat/agent-conversation-jck283`. It is a standalone HTML prototype, not an installed application feature. One button opens a text/voice dialog with supporting public evidence. Existing app code, authentication and mounted endpoints are unchanged.

## Working offline

Text answers select bounded fixtures from the portfolio's curated public evidence. Unknown questions explicitly return no supporting evidence. Source links accompany known answers. Voice plays a stock Windows SAPI audio sample of an existing public portfolio passage; it is not Jordan's cloned voice. Neither provider selector makes a network call. No microphone is requested or recorded. Mute, interruption, ending, Escape and mode changes stop playback or pending timers. The sample lasts under 20 seconds.

The collapsed Test states control exercises microphone denial, canceled sign-in, exhausted quota, provider failure and missing configuration. Provider failure permits text fallback. Four local turns simulate quota UI; refreshing resets them. This is deliberately not a production spending control.

The reusable check is `docs/mocks/tests/agent-conversation.mjs`. With the repository's existing Playwright dependencies and Chromium available, run `agent-terminal queue`, then `agent-heavy-check -- node docs/mocks/tests/agent-conversation.mjs`. Optional `PORTFOLIO_PLAYWRIGHT_PACKAGE` and `PORTFOLIO_CHROMIUM_PATH` point at an existing local dependency installation/browser; they do not install anything. Results and screenshots go to `.local/`. The runner performs no external HTTP requests or microphone calls. Real authentication, provider behavior, production quota persistence and server admission are not tested by these UI fixtures.

## Concrete registration plan

Official signup: https://elevenlabs.io/app/sign-up. Opened in Chrome; registration has not been submitted. Sign-in method remains Jordan's choice. BrowserAct has no configured browser/session and requires explicit permission to create a `chrome-direct` connection named `portfolio-elevenlabs-setup`. This would control the running Chrome window during setup. Jordan completes any authentication or CAPTCHA step. No paid plan, voice upload, cloning or API key has been created.

After registration, inspect the account's actual capabilities and limits. Before creating any persistent API key, review its exact endpoint permissions, credit quota and approved storage destination with Jordan. Do not paste a key into the mock, source control, client JavaScript, Linear or chat.

Proposed first integration: server-side text-to-speech for approved public passages, with a stock voice selected from the account's available voices. Restrict the key to the minimum speech endpoint capability the chosen implementation requires. Omit voice creation/deletion, cloning and unrelated administration. Set a reviewed custom provider credit quota; do not assume the free tier, authentication or a monthly plan is a hard spending limit. If that endpoint cannot be restricted as intended, leave live mode disabled.

Use existing approved secret storage only after action-time approval. A cloned voice is a separate opt-in step requiring Jordan's consent and provider verification; use stock voices until then. No recording or sample upload is part of this prototype.

## Proposed API contract (not mounted)

`voice-session-contract.json` describes fixtures for future server admission. Browser input includes a provider allowlist choice and bounded public question; trusted identity, evidence access and available budget come from the server. The browser cannot declare itself authenticated or choose a quota, API key, employer data source, tool name or billing scope.

Default live mode is disabled. The server must authenticate through existing auth, enforce durable global and per-user budgets, reject repeated/idempotency-replayed admission, reserve worst-case cost atomically before token/session issuance, and impose duration/output/concurrency caps. Denied or interrupted authentication issues no token. Missing accounting, credentials or provider limits fails closed. Provider failures release unused reservations only after verified accounting; never automatically retry paid calls. Client End/disconnect triggers server termination, and a server deadline closes orphaned sessions. Add provider-side credit caps as a second boundary.

The onsite agent and read-only MCP use the same curated public evidence and canonical sources. No employer code, private retrieval, shell access, arbitrary execution or coding-agent sandbox is exposed. Richer email-gated demos require a separate design and spending admission; email verification alone is not a budget.

Agents SDK migration stays incremental: preserve the existing harness's authentication, bounded tools and confirmation contracts. Browser conversational voice could use Agents JS Realtime with server-issued ephemeral credentials; the existing Python server flow needs a deliberate transport bridge. ElevenLabs custom LLM compatibility does not itself migrate the harness. No SDK/provider dependency or mounted live route is added by this mock.

## Official references

- ElevenLabs authentication, key restrictions and credit quotas: https://elevenlabs.io/docs/api-reference/authentication
- Voice cloning and verification: https://elevenlabs.io/docs/eleven-creative/voices/voice-cloning
- ElevenLabs custom LLM interface: https://elevenlabs.io/docs/eleven-agents/customization/llm/custom-llm
- Agents JS voice quickstart: https://openai.github.io/openai-agents-js/guides/voice-agents/quickstart/
- Agents Python realtime quickstart: https://openai.github.io/openai-agents-python/realtime/quickstart/

Remaining live configuration: browser-control approval, user sign-in, reviewed account limits, approved restricted key creation/storage, durable spend ledger, server-enforced termination, and real provider integration. All provider behavior in this artifact is mocked.

## Verified local review status — 2026-10-03

Shared-gate standalone Chromium pass: 15 groups cover source-grounded text, unsupported claims, shared four-turn fixture quota, repeat admission, pending-answer cancellation, microphone denial, canceled sign-in, missing config, provider errors/text fallback, both voice fixtures with real offline audio, mute/unmute, interruption/End/Escape/focus, playback rejection, provider changes/page hiding, and light/dark at 320/390/768/1280px. Zero page errors, external requests or microphone calls. Screenshots visually reviewed. Inline JavaScript and reusable runner syntax, disabled JSON contract, and git whitespace checks passed. No frontend/backend app source changed, so prior application suites were not repeated; Docker/Terraform/live-provider checks were not run.
