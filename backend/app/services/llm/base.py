"""Provider-neutral types for the chat assistant's model backends.

chat_service.py builds one `LLMRequest` and consumes a stream of normalized
events; each provider renders the request into its own wire format and maps
its own failures onto the exceptions below. Nothing here touches the network.
"""
from __future__ import annotations

from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any, Protocol

# Normalized finish reasons.
STOP_END = "end"
STOP_MAX_TOKENS = "max_tokens"
STOP_TOOL_USE = "tool_use"
STOP_BLOCKED = "blocked"  # safety / policy block: nothing usable was produced
STOP_ERROR = "error"


@dataclass(frozen=True)
class TextDelta:
    text: str


@dataclass(frozen=True)
class ToolCall:
    id: str
    name: str
    args: dict
    # Opaque provider data that must be echoed back unchanged on the next turn
    # (Gemini 3 `thoughtSignature`).
    provider_state: dict = field(default_factory=dict)


@dataclass(frozen=True)
class Usage:
    input_tokens: int | None = None
    output_tokens: int | None = None
    cache_creation_input_tokens: int | None = None
    cache_read_input_tokens: int | None = None

    @property
    def total_tokens(self) -> int:
        return (self.input_tokens or 0) + (self.output_tokens or 0)


@dataclass(frozen=True)
class Finish:
    stop_reason: str


Event = TextDelta | ToolCall | Usage | Finish


@dataclass
class LLMRequest:
    """One model call.

    `messages` are normalized turns:
      {"role": "user", "text": str}
      {"role": "assistant", "text": str, "tool_calls": [ToolCall, ...]}
      {"role": "tool", "results": [{"call_id", "name", "output": dict}, ...]}
    `visitor_context` (untrusted page text, already wrapped) is attached to the
    newest user turn only, never to the system prompt.
    """

    model: str
    max_tokens: int
    system_parts: list[str]
    messages: list[dict]
    visitor_context: str
    tools: list[dict]


class ProviderError(Exception):
    """Generic failure. `kind` is a short, log-safe label (never response text)."""

    kind = "error"


class ProviderAuthError(ProviderError):
    kind = "auth"


class ProviderRateLimited(ProviderError):
    kind = "rate_limited"


class ProviderUnavailable(ProviderError):
    """5xx, timeout or dropped connection: worth a retry."""

    kind = "unavailable"


class LLMProvider(Protocol):
    name: str

    def plan_models(self, primary: str, fallback: str | None) -> list[str]:
        """Models to try in order for one request (retry / fallback policy)."""
        ...

    def stream(self, request: LLMRequest) -> AsyncIterator[Event]:
        """Yield events; raise a ProviderError subclass on failure."""
        ...

    async def aclose(self) -> None: ...


def scrub(text: str, *secrets: str | None) -> str:
    """Remove secret values from text before it can reach a log line."""
    for secret in secrets:
        if secret:
            text = text.replace(secret, "[redacted]")
    return text


JSON = dict[str, Any]
