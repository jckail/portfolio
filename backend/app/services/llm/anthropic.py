"""Anthropic Claude provider: the original chat backend behind the interface."""
from __future__ import annotations

import json
from collections.abc import AsyncIterator

import anthropic
from anthropic import AsyncAnthropic

from backend.app.services.llm.base import (
    STOP_BLOCKED,
    STOP_END,
    STOP_ERROR,
    STOP_MAX_TOKENS,
    STOP_TOOL_USE,
    Event,
    Finish,
    LLMRequest,
    ProviderAuthError,
    ProviderError,
    ProviderRateLimited,
    ProviderUnavailable,
    TextDelta,
    ToolCall,
    Usage,
)

_STOP_MAP = {
    "end_turn": STOP_END,
    "stop_sequence": STOP_END,
    "max_tokens": STOP_MAX_TOKENS,
    "tool_use": STOP_TOOL_USE,
    "refusal": STOP_BLOCKED,
}


def build_system_blocks(system_parts: list[str]) -> list[dict]:
    """System prompt as blocks, cached in full.

    Everything per-request (time, page context) is kept out of here: a byte
    change would also invalidate the cached conversation history.
    """
    blocks: list[dict] = [{"type": "text", "text": part} for part in system_parts]
    if blocks:
        blocks[-1]["cache_control"] = {"type": "ephemeral"}
    return blocks


def build_messages(messages: list[dict], visitor_context: str) -> list[dict]:
    """Render normalized turns as Anthropic messages.

    Two additions are never stored in history: a cache breakpoint on the
    previous assistant turn, and the visitor context block prepended to the
    newest user turn.
    """
    rendered: list[dict] = []
    for turn in messages:
        role = turn["role"]
        if role == "user":
            rendered.append({"role": "user", "content": turn["text"]})
        elif role == "assistant":
            blocks: list[dict] = []
            if turn.get("text"):
                blocks.append({"type": "text", "text": turn["text"]})
            for call in turn.get("tool_calls") or []:
                blocks.append({"type": "tool_use", "id": call.id, "name": call.name, "input": call.args})
            if len(blocks) == 1 and blocks[0]["type"] == "text":
                rendered.append({"role": "assistant", "content": turn["text"]})
            else:
                rendered.append({"role": "assistant", "content": blocks})
        elif role == "tool":
            rendered.append({
                "role": "user",
                "content": [
                    {
                        "type": "tool_result",
                        "tool_use_id": result["call_id"],
                        "content": result["output"] if isinstance(result["output"], str)
                        else json.dumps(result["output"]),
                    }
                    for result in turn["results"]
                ],
            })

    if len(rendered) >= 2 and rendered[-2]["role"] == "assistant" and isinstance(rendered[-2]["content"], str):
        rendered[-2]["content"] = [{
            "type": "text",
            "text": rendered[-2]["content"],
            "cache_control": {"type": "ephemeral"},
        }]
    if rendered and rendered[-1]["role"] == "user" and isinstance(rendered[-1]["content"], str):
        rendered[-1]["content"] = [
            {"type": "text", "text": visitor_context},
            {"type": "text", "text": rendered[-1]["content"]},
        ]
    return rendered


class AnthropicProvider:
    name = "anthropic"

    def __init__(self, api_key: str) -> None:
        # One client for the whole application. The SDK already retries
        # transient failures (max_retries), so no extra retry plan is needed.
        self.client = AsyncAnthropic(api_key=api_key or None, max_retries=3, timeout=60.0)

    def plan_models(self, primary: str, fallback: str | None) -> list[str]:
        return [primary]

    async def aclose(self) -> None:
        await self.client.close()

    async def stream(self, request: LLMRequest) -> AsyncIterator[Event]:
        try:
            async with self.client.messages.stream(
                model=request.model,
                max_tokens=request.max_tokens,
                system=build_system_blocks(request.system_parts),
                messages=build_messages(request.messages, request.visitor_context),
                tools=request.tools,
            ) as stream:
                async for text in stream.text_stream:
                    if text:
                        yield TextDelta(text)
                final = await stream.get_final_message()
        except (anthropic.AuthenticationError, anthropic.PermissionDeniedError) as exc:
            raise ProviderAuthError(type(exc).__name__) from None
        except anthropic.RateLimitError as exc:
            raise ProviderRateLimited(type(exc).__name__) from None
        except (anthropic.APIConnectionError, anthropic.APITimeoutError, anthropic.InternalServerError) as exc:
            raise ProviderUnavailable(type(exc).__name__) from None
        except ProviderError:
            raise
        except Exception as exc:
            raise ProviderError(type(exc).__name__) from None

        for block in getattr(final, "content", None) or []:
            if getattr(block, "type", None) != "tool_use":
                continue
            raw = getattr(block, "input", None)
            yield ToolCall(
                id=str(getattr(block, "id", "") or ""),
                name=getattr(block, "name", "") or "",
                args=raw if isinstance(raw, dict) else {},
            )
        usage = getattr(final, "usage", None)
        if usage is not None:
            yield Usage(
                input_tokens=getattr(usage, "input_tokens", None),
                output_tokens=getattr(usage, "output_tokens", None),
                cache_creation_input_tokens=getattr(usage, "cache_creation_input_tokens", None),
                cache_read_input_tokens=getattr(usage, "cache_read_input_tokens", None),
            )
        raw_stop = getattr(final, "stop_reason", None)
        yield Finish(_STOP_MAP.get(raw_stop, STOP_ERROR if raw_stop else STOP_END))
