# JCK-201 agent-first portfolio review

Review branch: `feat/agent-first-mcp-jck201`. Accepted base: `184a0058e74acb788e03902d5bce173eeb081d54`. Local review only; no push, publication, deployment or paid provider call.

## Working implementation

The portfolio now prominently mounts a lazy-loaded evidence assistant after About and before Experience. Existing project, resume, skills and experience sections remain available. It displays exact passages and canonical source links from the existing curated public JSON retrieval.

Both mounted endpoints share that retrieval:

- `POST /api/assistant/evidence`: bounded public query and source-backed deterministic answer.
- `POST /api/mcp`: stateless, JSON-only Streamable HTTP with one read-only `search_public_evidence` tool.

The connector panel supplies the current-origin MCP URL, a copyable Claude Code command, OpenAI Responses API MCP configuration with a single allowed tool and required approval, and public document fallbacks. Each visitor's own assistant provider may charge for its model calls; the portfolio MCP endpoint performs no provider calls. Missing evidence yields an explicit limitation rather than a fabricated achievement.

Queries are limited to 200 characters and allowlisted public collections. MCP requests are capped at 8 KiB before extending the request buffer, validate JSON-RPC arguments and origins, and reject unsupported protocol versions, batching, private/tool-execution inputs and unknown tools. Request rate limits apply per IP and per instance. These are abuse controls for unpaid retrieval, not distributed spending limits.

Existing chat, authentication, configuration, contact and dialog implementations are unchanged. Richer demos have a truthful unavailable state; checking access performs no sign-in, email, credential or paid operation. There is no arbitrary code execution, shell access, private repository access or environment-variable tool.

## Ownership and integration

The original portfolio owner approved scope 92 in AgentMon message 2572 after checking the accepted base and three vacant mount paths. The coordinator granted it in message 2588. The earlier hold is resolved.

The mounted shared paths are limited to `backend/app/api/__init__.py`, `frontend/src/app/components/main-content.tsx` and `frontend/src/shared/utils/api/endpoints.ts`. The component uses the canonical shared HTTP client and endpoint map. Both routers are registered on the actual application. `patches/agent-first-integration.patch` is retained as the historical review proposal; its intended integration is now applied. The redundant new endpoint helper was removed.

Release/deploy ownership stays with the existing release captain. The parent thread remains the sole writer for Linear JCK-201.

## Agents SDK assessment and remaining live configuration

The existing chatbot already has a provider-neutral streaming interface, grounded search and confirmation tools. Replacing it wholesale would discard useful contracts and expand the authorized change. This branch adds an **optional, unmounted SDK draft adapter** sharing the curated public evidence, while the working onsite and MCP experiences remain unpaid.

The adapter requires explicit approval, a verified subject from the existing auth boundary, an atomic durable shared token ledger, and an explicitly supplied OpenAI client with retries disabled. It reserves a conservative worst-case token budget before importing or calling the SDK, allows one turn, caps output at 512 tokens, disables tracing, times out after 20 seconds, and provides no tools or handoffs. Failures and cancellation retain their reservations; storage errors deny dispatch. Authentication alone cannot unlock spending. Generated SDK text is a review draft; source passages remain authoritative.

No SDK dependency or provider client/credentials was added, and no live SDK/model call occurred. Tests mock the SDK. Before activation, Jordan must approve the new runtime dependency/provider configuration; implementation must add and verify atomic daily global and per-subject reservations across instances/restarts, enforce the existing verified-email boundary, and qualify real provider billing and limits. No public route currently enables this adapter.

Email-gated rich demos and coding-agent sessions remain unavailable scaffolding. No new authentication flow is claimed implemented or tested.

## Verification

Final integrated local qualification passed against source commit `3ac6f5b409532b280911f061dc591a1a25d5710d`. Logs and browser artifacts are under `.local/` in this review worktree, outside the commit.

Full frontend suite: **96 files / 663 tests passed**; coverage statements **83.48%**, branches **76.8%**, functions **83.23%**, lines **84.87%**. The production build passed.

The existing official JavaScript MCP SDK initialized, listed and called the actual mounted application, returning five real sources. Chromium tested the built production bundle in light and dark themes: evidence lookup, source links and skill deep-link dialogs, connector configuration, clipboard outcome, disabled demo access and existing project cards. Mobile width, cancellation and a synthetic quota response passed. **Zero browser page errors.** Actual request repetition/rate exhaustion and source isolation were tested offline in the backend suite. The final browser-only shared-gate job `3867902` exited 0; receipt: `.local/agent-integrated-results.json`; log: `.local/integrated-browser-diagnostic-3.log`; screenshots: `.local/agent-integrated-light.png` and `.local/agent-integrated-dark.png`. The harness was corrected to select assistant articles rather than existing project cards, and to give the cancellation fixture a bounded 2-second delay. No product fix was needed. All own preview servers stopped; ports 8087 and 5203 were clear.

Integrated backend suite: **1,175 passed, 8 skipped, 1 deselected**, coverage **95.22%**; authentication/admin coverage **95%**. Backend Ruff, full frontend lint and TypeScript checks passed. Focused new backend tests: 23; new frontend tests: 4.

The offline tests cover identical onsite/MCP sources, missing evidence, public collection isolation, malformed/oversized/deep JSON, origin/protocol/accept validation, repeated requests and rate exhaustion, cancellation/stale responses, clipboard denial, disabled demo access, missing spending admission, ledger failure/quota exhaustion, disabled retries and interrupted SDK reservations. SDK invocation is mocked. Authentication is preserved; checking unavailable demo access does not begin authentication.

Dependencies were reused locally without installation or lock changes. Tests use Python 3.12 and existing Node 24.20.0; the repository's expected Node runtime is 22. The reusable Pi package lock exactly matches this checkout.

Docker, Terraform, hosted CI, live provider billing and deployment are outside these local checks. Hosted Actions billing/admission is an independent reported concern; no runner, billing or security settings were changed. Source indexing coverage for the new worktree remains a separate coordination item and is not claimed refreshed.

## Official references

- [Agents SDK runner and turn limits](https://openai.github.io/openai-agents-python/running_agents/)
- [Agents SDK model/client configuration](https://openai.github.io/openai-agents-python/config/)
- [OpenAI client retries](https://github.com/openai/openai-python#retries)
- [MCP Streamable HTTP transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- [Claude Code remote MCP setup](https://code.claude.com/docs/en/mcp)
- [OpenAI Responses API remote MCP tools](https://developers.openai.com/api/docs/guides/tools-connectors-mcp)
