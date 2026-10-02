# Private Pi operating copilot

This package runs the genuine Pi `Agent` tool loop using the current official
[`@earendil-works/pi-agent-core`](https://www.npmjs.com/package/@earendil-works/pi-agent-core)
and [`pi-ai`](https://www.npmjs.com/package/@earendil-works/pi-ai) SDKs, pinned to
1.0.0 in the lockfile. The earlier `@mariozechner` names are deprecated in npm;
the official repository is [earendil-works/pi](https://github.com/earendil-works/pi).
The installed agent README documents custom `streamFn` and tool lifecycle events.

The Python backend starts `node copilot/server.mjs` for each visitor turn and owns
the provider HTTP connection, credentials, workspace token, SQL safety checks and
pending confirmations. Node receives no credentials or workspace token. It uses a
custom Pi stream function rather than a provider registry, credential resolver,
coding-agent session, host configuration, resource loader or default tools.
There is no HTTP server or listening port. Shell, filesystem, extension, skill,
session and credential discovery tools are never registered. Model metadata is
only a descriptor for the custom stream, not a direct provider connection.

Use Node >=22.19 (the production image uses Node 24). Install reproducibly with
`npm ci --ignore-scripts --omit=dev` in this directory. Run the offline tests with
`npm test`. Tests execute the installed Pi library with fake provider responses;
they require no model credentials or network calls.

## Duplex NDJSON protocol

Python writes one JSON object per line to stdin. Node writes JSON objects only to
stdout. Stderr never contains provider errors or credentials. Run one process per
turn, cancel and reap it when the client disconnects, and supply a minimal process
environment without secrets. Backend integration must never forward private
`provider_request` or `tool_request` frames directly to the browser.

Start:

```json
{"type":"start","prompt":"Explain my workspace","history":[],"model":"gemini-3.1-flash"}
```

History consists only of `{role:"user"|"assistant",text:string}` records. It
cannot add system instructions, tool transcripts or provider signatures. To cancel,
write `{"type":"cancel"}`; closing stdin also cancels pending work.

A provider request is private:

```text
{type:"provider_request",id:string,request:{model,systemPrompt,messages,tools,maxTokens:1024}}
```

Messages match the existing Python `LLMRequest` normalized turn format:

- `{role:"user",text}`
- `{role:"assistant",text,tool_calls:[{id,name,args,provider_state}]}`
- `{role:"tool",results:[{call_id,name,output}]}`

Tools are `{name,description,input_schema}`. The backend maps these into its
existing provider-neutral request. Provider results are:

```text
{type:"provider_result",id,result:{text,tool_calls:[{id,name,args,provider_state}],usage:{input_tokens,output_tokens},stop_reason:"end"|"tool_use"|"max_tokens"|"blocked"|"error"}}
```

Optional `{type:"provider_delta",id,text}` frames stream text before the result;
`result.text` must equal the concatenation of those deltas. Without deltas, the
complete result text is emitted once. Provider errors use
`{type:"provider_error",id,kind}` with a short safe label, never an exception,
response body, key, URL or raw provider text. Opaque `provider_state` (including
Gemini thought signatures) is retained unchanged on the private request channel
between Pi rounds. Tool IDs are normalized to round-scoped Pi IDs, so providers
that restart fallback IDs each response cannot collide with earlier calls. Matching
call/result IDs and their individual signatures stay paired; duplicate provider IDs
within one response are still rejected. Provider state never appears in browser events or local session files.

Tools use `{type:"tool_request",id,tool,args}` and receive
`{type:"tool_result",id,result}` or `{type:"tool_error",id,kind}`. Registered
schemas are exported as `TOOL_SCHEMAS` from `agent.mjs`:

| Tool | Parameters | Backend behavior |
| --- | --- | --- |
| `inspect_catalog` | Optional section: summary, architecture, exploration, runs | Bounded catalog metadata |
| `inspect_workspace` | Empty object | Current private workspace schema/counts/state |
| `inspect_incident` | Empty object | Bounded partition lag, cumulative replay counters, quarantine reasons, latest run contracts/freshness and twenty recent logs; does not advance background execution |
| `query_sql` | sql <=20,000 characters; optional row_limit 1..500 | Bounded read-only SQL, independently validated by Python |
| `inspect_run` | Optional run_id <=100 characters | Latest runtime trace or a named saved catalog run |
| `propose_runtime_change` | Runtime action parameters plus reason <=500 characters | Create a pending confirmation; never apply a mutation |

`propose_runtime_change` supports the runtime's producer, consumer, replay, DAG,
model and reset action names, with explicit numeric bounds and no extra fields.
Only a bridge result containing a `proposal` object emits a proposal event.
Python must validate that object, assign the confirmation ID and bind it to the
workspace; the browser follows its explicit confirmation path to apply it.

Public event frames are `delta {text}`, `tool_start {tool}`, `tool_end {tool,ok}`,
`proposal {proposal}`, `error {kind}` and terminal
`done {ok,cancelled,limited}`. The backend may map these into its public SSE
contract; it must forward only this allowlist. Tool args, results, prompt history,
provider requests and provider signatures are absent from public trace events.

## Bounds and cancellation

The package enforces 20 history turns, 8,000 characters per user/history message,
60 Pi transcript messages, six provider rounds, eight total tool calls, 16,000
text characters per provider response, 24 KiB tool arguments, 64 KiB tool results,
512 KiB provider requests, 1 MiB NDJSON frames, 20-second bridge waits and a
60-second total deadline. Tool execution is sequential. Unknown tools are rejected
before reaching the bridge; Pi validates registered argument schemas. Only safe
error kinds survive into the model or browser; thrown bridge messages are dropped.

A cancellation aborts the real Pi agent and pending bridge requests. The backend
must also cancel its provider HTTP stream and kill/reap the Node subprocess if it
does not terminate promptly. These local bounds supplement backend per-workspace
limits, provider token budgets, authentication, request rate limits and SQL guards.

The Python bridge adds bounded `tool_result` evidence to its HTTP response: SQL,
columns, elapsed time, requested row limit, returned row count and at most ten
sample rows; workspace table counts/backlog; bounded incident diagnostics; and
actual run publication/trace/freshness metadata. SQL `row_count` counts returned
rows, not all matching rows. `truncated` describes the query limit, while
`sampled_row_count` and `sample_truncated` describe the displayed evidence sample.
`sql_truncated` marks SQL shortened to 4,000 characters. Query generation and data
revision come from locked execution, not a preceding workspace observation.
Evidence is capped at 12 KiB per tool; dropping rows resets the sample count to zero.
It serializes one turn per workspace and at most two turns per process. Provider
spend reserves a conservative request-byte input ceiling plus 1,024 output tokens
before each round, then settles known cumulative usage once; unknown failure usage
retains the reservation charge. The UTC daily budget is process-local, not a
site-wide or billing-provider quota. Confirmation IDs are workspace-bound, expire
after ten minutes, and are atomically single-use even when the action fails.
They also bind to the workspace generation: reset rotates the generation, and
confirmation checks it atomically before applying the action. Each investigation
retains its starting generation across tool calls and fails safely if reset replaces
the workspace; it never silently continues an old investigation against fresh state.
Cancelled/failed turns remove proposals that were never delivered to the visitor.
