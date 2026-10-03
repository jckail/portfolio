# Portfolio agent and voice direction

These two HTML concepts move the agent into the first screen: an inline invitation below the introduction, or a compact companion beside it. Both keep the name, existing portrait, current public role, curated biography, project evidence and resume/experience navigation. No production redesign has been applied. The controls compare layouts and themes. Suggested questions render existing public evidence; unsupported questions return an explicit mock limitation.

The microphone button opens a scripted voice interaction preview. It shows listening, answering, a linked public source, interruption/Stop and returning focus on close. It does not request microphone permission, record audio, play speech, contact a provider, mint credentials or run the OpenAI SDK. Animation and transcript are UI fixtures, not a working conversational voice service.

The visual reference pass reviewed [Linear](https://linear.app/) and [Vercel AI](https://vercel.com/ai). The proposed design interpretation is restrained typography, subtle surfaces and one clearly visible interaction area. These are independent HTML concepts using the existing public content and embedded assets, not copies of those products or paid Superdesign generations.

## SDK assessment

The current portfolio already has a provider-neutral chat stream, allowlisted tools, grounded public retrieval, action confirmation, auth and WebSocket limits. The existing `agents_sdk_adapter.py` is an optional unmounted draft with mocked SDK tests; its public evidence and spending admission interfaces are useful starting points. It is not a completed migration or a live voice implementation.

Recommendation: migrate text orchestration behind the existing backend interface using the Python Agents SDK first. Keep browser frame contracts, existing confirmation/auth behavior and provider fallback unchanged. Start with a bounded public-evidence-only agent; preserve the authority of linked source passages. SDK tracing must remain disabled or separately reviewed for privacy. Do not add shell, private repository, remote URL fetching or arbitrary code execution tools. The public MCP tool and onsite assistant should continue using the same curated evidence.

Voice is a distinct runtime, rather than adding text-to-speech to the text Runner. The official [JavaScript voice quickstart](https://openai.github.io/openai-agents-js/guides/voice-agents/quickstart/) uses `RealtimeAgent`/`RealtimeSession`, supports browser WebRTC, and obtains short-lived client credentials through the backend. Its default connection requests microphone access. [Building voice agents](https://openai.github.io/openai-agents-js/guides/voice-agents/build/) covers turn detection, interruptions and tools. The [Python realtime quickstart](https://openai.github.io/openai-agents-python/realtime/quickstart/) describes server-side WebSocket sessions; it explicitly does not provide browser WebRTC transport or microphone capture/playback.

For this React/FastAPI repo, evaluate a server-owned Python realtime session with an explicit browser audio bridge against the browser WebRTC path with server-owned controls. The former fits the existing backend and makes server termination straightforward but needs audio capture/playback and interruption work. The latter is a good low-latency browser experience, but needs a verified server control channel and hard termination; client controls and ephemeral token expiry alone cannot enforce spending. Do not introduce a new Node service solely for a quick demo before comparing these paths. The transport decision and approved model/pricing need a small offline integration spike, not a wholesale rewrite.

## Activation requirements

Live activation remains disabled until these are implemented and reviewed:

1. Existing verified-email identity plus atomic durable global/per-subject budget reservations shared across instances and restarts. Storage failure, quota exhaustion or missing configuration deny provider dispatch and credential minting.
2. A conservative reservation that covers the maximum permitted session usage at approved current model rates. Bounded session duration, audio/input/output size, turns and concurrent sessions. A backend timer and provider cancellation enforce termination independent of the browser. Limits must cover hidden tabs, disconnects, reconnects and abandoned streams; auth alone is not a limit.
3. Server-owned allowlisted public tools and configuration. No long-lived API key, tool credentials, private employer data or arbitrary caller-provided tool definitions enter the browser. Explicit start/permission, persistent mute/end controls, text fallback and clear mic state. Permission denial, revocation or interruption clean up local and server resources.
4. Real dependency/configuration approval before installation and any live credential or paid call. No new persistent auth grants. Real billing/termination qualification must pass before enabling a public voice endpoint. Existing optional draft reservations are not sufficient for realtime billing.

Offline tests for a future spike must cover concurrent quota admission, repeated session requests, reservations retained on failure/cancellation, no retries that multiply spending, denied/interrupted auth and microphone access, stale callbacks, server timeout, cross-instance exhaustion, provider/tool failures, transcript/source isolation and unchanged existing chat confirmations. A voice demo should fail closed to text when live admission is unavailable.

No SDK dependency, keys, new backend routes or paid sessions were added during this design pass. No deployment or publishing occurred.

## Local verification

The standalone HTML passed both directions in light/dark, curated evidence/project answers, unsupported queries, connector disclosure, scripted voice source/Stop/Escape/focus restoration/interruption, and both layouts at 320/390/768/1280px. Zero browser page errors and zero external requests. Existing application source is unchanged, so its prior 666 frontend tests, lint/types/build were not repeated. SDK and voice behavior are researched proposals and mocked UI, not live provider qualification. The companion-light concept was opened in a visible Chrome window on GamingRig.
