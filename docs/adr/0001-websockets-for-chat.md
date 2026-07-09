# 0001: WebSockets (not SSE) for the chat assistant

**Status:** Accepted (reflects the current implementation)

## Context

The chat assistant needs to stream tokens from Claude to the browser as
they arrive, plus send the occasional non-text frame (`{"type":"action"}`
for `navigate_section`/`open_modal`/`download_resume`/`prefill_contact`,
history replay after reconnect, rate-limit notices). Two natural options:
Server-Sent Events (one-way HTTP stream, client sends new messages via a
separate POST) or a single WebSocket connection for both directions.

## Decision

Use a WebSocket per chat session (`backend/app/api/chat_routes.py`,
mounted under `/ws`), with a `ConnectionManager` in
`services/chat_service.py` holding per-connection state (history,
context, rate-limit counters).

## Consequences

- One connection carries both the streamed assistant response and
  structured action frames — no separate channel or polling needed for
  the frontend to receive `{"type":"action"}` navigation events.
- Server-side state (conversation history, rate limiting) lives in the
  `ConnectionManager` keyed by `client_id`, scoped to the connection's
  lifetime — simpler than correlating a stateless SSE stream with
  separate POST requests.
- Cost: WebSockets need explicit reconnect/backoff handling on the
  client (`useChat.ts`) and don't work through every restrictive proxy —
  SSE degrades more gracefully over plain HTTP. Not a concern for this
  service's ingress.
- Cloud Run supports WebSockets natively (session affinity via the
  `run.googleapis.com` connection), so no additional infrastructure was
  needed to keep this working.
