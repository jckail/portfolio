# JCK-201 agent-first portfolio review

Review branch: `feat/agent-first-mcp-jck201`. Frozen accepted base: `184a0058e74acb788e03902d5bce173eeb081d54`.

## Working, local implementation

- An onsite evidence assistant displays exact passages and canonical links from the existing curated JSON search.
- A stateless Streamable HTTP MCP server provides one bounded, read-only `search_public_evidence` tool. It shares the onsite evidence service, validates arguments and origins, bounds request bytes, and rate-limits requests. It performs no provider calls.
- The component provides a Claude Code command, OpenAI Responses API MCP configuration, a remote URL, and fallback public documents. Copy feedback is truthful; missing evidence produces a clear limitation instead of an achievement.
- Existing project content, authentication, paid chatbot providers, browser actions and confirmation tools are unchanged.
- Richer email-gated demos are explicitly unavailable. Checking access performs no authentication, email, credential or model operation.

## Integration ownership blocker

The AgentMon coordinator explicitly held existing paths in message 2303 pending the original Portfolio owner's current-base and path receipt. New-file work was acknowledged. Requests 2254, 2267, 2278, 2339 and 2396 document reconciliation and concrete implementation evidence.

`patches/agent-first-integration.patch` is an **unapplied** proposal: mount both new API routers under /api; lazy-load the assistant after About; add paths to the canonical endpoints map; point the component at that map. The current production entrypoints do not mount the new experience. Do not describe this branch as a completed site upgrade until integration and integrated checks pass.

## Agents SDK assessment

The accepted app already has a provider-neutral streaming interface, grounded search and bounded confirmation tools. Replacing it wholesale would discard useful contracts and increase this change's scope. This branch therefore includes an **unmounted, optional SDK draft adapter**, separate from the working unpaid evidence experience.

The adapter requires explicit approval, a verified subject supplied by the existing auth boundary, a durable shared token ledger and an explicit OpenAI client with retries disabled. It reserves a conservative worst-case input/output budget before importing or invoking the SDK, allows one model turn, caps output at 512 tokens, disables tracing, applies a 20-second timeout and supplies no tools or handoffs. Failed/uncertain/canceled calls stay reserved. Ledger failures deny dispatch. Auth alone cannot enable spending.

No SDK dependency was added, no provider client/credentials were created, and no SDK/live-model run occurred. Mock SDK tests validate the admission and invocation contract only. Before activation: approve and hash-pin the runtime dependency through the repo lock workflow; configure the approved provider in Settings; implement and verify atomic daily global + per-subject reservations across every instance/restart; enforce the existing verified-email access boundary; test billing and model limits without opening public execution. Generated SDK text remains a review draft, not authoritative evidence.

Coding-agent demos remain deferred scaffolding. No arbitrary code execution, shell access, filesystem tools, private repositories or environment variables are exposed.

## Verification

Focused backend tests: 22 passed. Focused frontend tests: 4 passed. Backend Ruff, frontend focused ESLint and full TypeScript checks passed.

The existing official JavaScript MCP SDK client initialized, listed and called the local server against actual curated sources. Local Chromium tested light/dark evidence lookup and links, connect instructions, clipboard outcome, denied richer-demo access, mobile overflow and cancellation. Quota/error UI used synthetic browser responses; backend repetition/quota paths used offline tests. Zero browser page errors. Screenshots and runtime receipt are local in `.local/`.

SDK behavior is **mocked**, including denial on missing approval/identity/ledger, quota exhaustion, ledger failure, default retry rejection and interruption. Authentication is preserved; no new sign-in or email-verification flow is implemented or claimed tested.

Full frontend lint, type-check and coverage suite: 96 files / 663 tests passed; statements83.48%, branches76.8%, functions83.22%, lines84.87%. Full backend: 1130 passed, 8 skipped, 1 deselected, 44 setup errors caused by absent existing Pi Node dependencies in the fresh worktree. Coverage91.47%; auth surface95%. The Pi package lock exactly matches the reusable local installation, now linked into this worktree. The corrected broad rerun was denied by the shared gate after its bounded wait (exit75); no unchanged retry. Thus the full backend suite is not claimed green. Ruff over all backend passed. Shared code indexing was not refreshed for this branch; an existing graph refresh owner occupied the gate. Docker/Terraform/hosted CI/deployment were not run. Hosted Actions allowance/payment admission is a reported independent risk; no billing, runner or security settings were changed.

All preview servers were stopped. Nothing was pushed, published or deployed.

## Official references

- [Agents SDK runner and turn limits](https://openai.github.io/openai-agents-python/running_agents/)
- [Agents SDK model/client configuration](https://openai.github.io/openai-agents-python/config/)
- [OpenAI client retries](https://github.com/openai/openai-python#retries)
- [MCP Streamable HTTP transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- [Claude Code remote MCP setup](https://code.claude.com/docs/en/mcp)
- [OpenAI Responses API remote MCP tools](https://developers.openai.com/api/docs/guides/tools-connectors-mcp)
