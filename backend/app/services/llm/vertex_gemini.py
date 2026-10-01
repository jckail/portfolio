"""Gemini on Vertex AI over REST + SSE (httpx; no SDK dependency).

Auth is a service-account-bound API key sent only in the `x-goog-api-key`
header. The key is never placed in a URL, never logged, and every error raised
from here carries only a short label, never response or exception text.
"""
from __future__ import annotations

import json
from collections.abc import AsyncIterator

import httpx

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

VERTEX_BASE_URL = "https://aiplatform.googleapis.com/v1/publishers/google/models"

_BLOCKED_FINISH = frozenset({
    "SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII", "IMAGE_SAFETY", "LANGUAGE",
})
# Fields the Gemini function-declaration schema (an OpenAPI subset) accepts.
_SCHEMA_KEYS = ("type", "description", "enum", "properties", "required", "items", "format", "nullable")


def to_gemini_schema(schema: dict) -> dict:
    """Convert a JSON-schema tool parameter block to the Gemini OpenAPI subset."""
    out: dict = {}
    for key in _SCHEMA_KEYS:
        if key not in schema:
            continue
        value = schema[key]
        if key == "type" and isinstance(value, str):
            out[key] = value.upper()
        elif key == "properties" and isinstance(value, dict):
            out[key] = {name: to_gemini_schema(sub) for name, sub in value.items() if isinstance(sub, dict)}
        elif key == "items" and isinstance(value, dict):
            out[key] = to_gemini_schema(value)
        else:
            out[key] = value
    return out


def to_function_declarations(tools: list[dict]) -> list[dict]:
    declarations = []
    for tool in tools:
        declaration = {"name": tool["name"], "description": tool.get("description", "")}
        parameters = to_gemini_schema(tool.get("input_schema") or {})
        # Gemini rejects an OBJECT schema with no properties: omit it entirely.
        if parameters.get("properties"):
            declaration["parameters"] = parameters
        declarations.append(declaration)
    return declarations


def _tool_output(output: object) -> dict:
    return output if isinstance(output, dict) else {"output": output}


def build_contents(messages: list[dict], visitor_context: str) -> list[dict]:
    contents: list[dict] = []
    for turn in messages:
        role = turn["role"]
        if role == "user":
            contents.append({"role": "user", "parts": [{"text": turn["text"]}]})
        elif role == "assistant":
            parts: list[dict] = []
            if turn.get("text"):
                parts.append({"text": turn["text"]})
            for call in turn.get("tool_calls") or []:
                part: dict = {"functionCall": {"name": call.name, "args": call.args}}
                signature = call.provider_state.get("thoughtSignature")
                if signature:
                    part["thoughtSignature"] = signature
                parts.append(part)
            if parts:
                contents.append({"role": "model", "parts": parts})
        elif role == "tool":
            contents.append({
                "role": "user",
                "parts": [
                    {"functionResponse": {"name": r["name"], "response": _tool_output(r["output"])}}
                    for r in turn["results"]
                ],
            })
    if contents and contents[-1]["role"] == "user" and "text" in contents[-1]["parts"][0]:
        contents[-1]["parts"].insert(0, {"text": visitor_context})
    return contents


def build_body(request: LLMRequest) -> dict:
    body: dict = {
        "systemInstruction": {"parts": [{"text": part} for part in request.system_parts]},
        "contents": build_contents(request.messages, request.visitor_context),
        "generationConfig": {"maxOutputTokens": request.max_tokens},
    }
    if request.tools:
        body["tools"] = [{"functionDeclarations": to_function_declarations(request.tools)}]
    # Gemini 3 reasons before answering; thinking tokens count against
    # maxOutputTokens, so keep it minimal for a short conversational reply.
    if request.model.startswith("gemini-3"):
        body["generationConfig"]["thinkingConfig"] = {"thinkingLevel": "LOW"}
    elif request.model.startswith("gemini-2.5-flash"):
        body["generationConfig"]["thinkingConfig"] = {"thinkingBudget": 0}
    return body


class VertexGeminiProvider:
    name = "vertex"

    def __init__(self, api_key: str, *, transport: httpx.AsyncBaseTransport | None = None,
                 retry_delay: float = 0.5) -> None:
        self._api_key = api_key
        self.retry_delay = retry_delay
        self._http = httpx.AsyncClient(
            timeout=httpx.Timeout(60.0, connect=10.0),
            transport=transport,
        )

    def plan_models(self, primary: str, fallback: str | None) -> list[str]:
        # Retry the primary once, then fall back to the second model.
        plan = [primary, primary]
        if fallback and fallback != primary:
            plan.append(fallback)
        return plan

    async def aclose(self) -> None:
        await self._http.aclose()

    async def stream(self, request: LLMRequest) -> AsyncIterator[Event]:
        url = f"{VERTEX_BASE_URL}/{request.model}:streamGenerateContent"
        headers = {"x-goog-api-key": self._api_key, "content-type": "application/json"}
        calls: list[ToolCall] = []
        usage: Usage | None = None
        finish_reason: str | None = None
        blocked = False

        try:
            async with self._http.stream(
                "POST", url, params={"alt": "sse"}, headers=headers, json=build_body(request)
            ) as response:
                status = response.status_code
                if status in (401, 403):
                    raise ProviderAuthError(f"http_{status}")
                if status == 429:
                    raise ProviderRateLimited("http_429")
                if status >= 500:
                    raise ProviderUnavailable(f"http_{status}")
                if status != 200:
                    raise ProviderError(f"http_{status}")

                async for line in response.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    payload = line[5:].strip()
                    if not payload:
                        continue
                    try:
                        chunk = json.loads(payload)
                    except json.JSONDecodeError:
                        continue
                    if not isinstance(chunk, dict):
                        continue

                    if (chunk.get("promptFeedback") or {}).get("blockReason"):
                        blocked = True
                    meta = chunk.get("usageMetadata")
                    if isinstance(meta, dict):
                        usage = Usage(
                            input_tokens=meta.get("promptTokenCount"),
                            # Thinking tokens are billed as output.
                            output_tokens=(meta.get("candidatesTokenCount") or 0)
                            + (meta.get("thoughtsTokenCount") or 0),
                            cache_read_input_tokens=meta.get("cachedContentTokenCount"),
                        )
                    for candidate in chunk.get("candidates") or []:
                        content = candidate.get("content") or {}
                        for part in content.get("parts") or []:
                            if not isinstance(part, dict):
                                continue
                            if part.get("thought") is True:
                                continue
                            call = part.get("functionCall")
                            if isinstance(call, dict):
                                state = {}
                                if part.get("thoughtSignature"):
                                    state["thoughtSignature"] = part["thoughtSignature"]
                                args = call.get("args")
                                calls.append(ToolCall(
                                    id=str(call.get("id") or f"call_{len(calls)}"),
                                    name=str(call.get("name") or ""),
                                    args=args if isinstance(args, dict) else {},
                                    provider_state=state,
                                ))
                            elif part.get("text"):
                                yield TextDelta(part["text"])
                        if candidate.get("finishReason"):
                            finish_reason = candidate["finishReason"]
        except ProviderError:
            raise
        except httpx.TimeoutException:
            raise ProviderUnavailable("timeout") from None
        except httpx.TransportError:
            raise ProviderUnavailable("connection") from None
        except httpx.HTTPError:
            raise ProviderError("http") from None

        for call in calls:
            yield call
        if usage is not None:
            yield usage

        if blocked or finish_reason in _BLOCKED_FINISH:
            yield Finish(STOP_BLOCKED)
        elif finish_reason == "MAX_TOKENS":
            yield Finish(STOP_MAX_TOKENS)
        elif calls:
            yield Finish(STOP_TOOL_USE)
        elif finish_reason in (None, "STOP"):
            yield Finish(STOP_END)
        else:
            yield Finish(STOP_ERROR)
