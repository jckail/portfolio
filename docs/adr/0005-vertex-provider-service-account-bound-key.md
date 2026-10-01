# 0005: Vertex AI behind a provider layer, with a service-account-bound key

**Status:** Accepted (2026-10)

## Context

The chat assistant called Anthropic directly from `chat_service.py`. The owner
wanted to run it on Gemini through Vertex AI (the project already lives on GCP,
billing and quota are in one place) without losing the option to go back.
Vertex also offers API keys. An unrestricted, project-level Google API key is a
bearer credential for whatever APIs the project enables, and the earlier audit
already found unbound keys in this project (`docs/audit-2026-09-06.md`).

## Decision

1. Put the model behind a small provider interface in
   `backend/app/services/llm/`. `chat_service.py` builds one neutral
   `LLMRequest` and reads normalized events; each provider renders its own wire
   format and maps its failures to `ProviderAuthError`, `ProviderRateLimited`
   or `ProviderUnavailable`. Providers: `vertex_gemini.py` (REST + SSE through
   httpx, no SDK) and `anthropic.py`.
2. `CHAT_PROVIDER` chooses the provider. Unset means Vertex when
   `VERTEX_API_KEY` exists, otherwise Anthropic. Neither key is required to
   boot; without one the chat reports itself unavailable.
3. The Vertex key must be a key **bound to a dedicated service account**
   (`portfolio-vertex`) and restricted to `aiplatform.googleapis.com`. An unbound
   key is rejected by Vertex, and a bound one carries only that account's
   permissions, so a leak cannot reach other services or other projects'
   data. The key is created and rotated with `gcloud` and stored in Secret
   Manager (`vertex-api-key`); it is deliberately **not** a Terraform resource,
   because that would write the key string into state and the state bucket is a
   known exposure (`HANDOFF.md`). The service account, its role and the enabled
   APIs are in `infra/vertex.tf`.
4. The key is sent only in the `x-goog-api-key` header. It is never placed in a
   URL, a log line or an exception message; provider errors carry only a short
   `kind`.
5. A daily token budget (`CHAT_DAILY_TOKEN_BUDGET`) and a circuit breaker on
   auth failures bound cost and hide the chat button when the key is rejected.

## Consequences

- Switching or adding a model vendor is a new provider file and a settings
  value, not a change to the chat protocol or the tools.
- Rotation is a manual runbook (`infra/README.md`, "Vertex API key"): new key,
  new secret version, new revision, verify, then delete the old key.
- The Terraform for the service account and monitoring is written but has not
  been applied to production. Applying it is an owner decision.
- Gemini specifics (tool-schema subset, thought signatures echoed back, safety
  blocks) stay inside `vertex_gemini.py`.
