"""Vertex Gemini provider: wire format, SSE parsing and error mapping (no network)."""
import asyncio
import json

import httpx
import pytest

from backend.app.services.chat_actions import CHAT_TOOLS
from backend.app.services.llm import (
    LLMRequest,
    ProviderAuthError,
    ProviderError,
    ProviderRateLimited,
    ProviderUnavailable,
    TextDelta,
    ToolCall,
    Usage,
    VertexGeminiProvider,
)
from backend.app.services.llm.base import STOP_BLOCKED, STOP_END, STOP_MAX_TOKENS, STOP_TOOL_USE
from backend.app.services.llm.vertex_gemini import build_body, to_function_declarations

KEY = "AQ.test-vertex-key-123"


def sse(*chunks: dict) -> bytes:
    return "".join(f"data: {json.dumps(c)}\r\n\r\n" for c in chunks).encode()


def text_chunk(text, **extra):
    return {"candidates": [{"content": {"role": "model", "parts": [{"text": text}]}, **extra}]}


def make_request(**overrides) -> LLMRequest:
    base = {
        "model": "gemini-3.1-flash-lite",
        "max_tokens": 256,
        "system_parts": ["SYSTEM A", "SYSTEM B"],
        "messages": [{"role": "user", "text": "Hi"}],
        "visitor_context": "<visitor_context>now</visitor_context>",
        "tools": CHAT_TOOLS,
    }
    base.update(overrides)
    return LLMRequest(**base)


def provider_for(handler) -> VertexGeminiProvider:
    return VertexGeminiProvider(KEY, transport=httpx.MockTransport(handler))


def collect(provider, request):
    async def run():
        return [event async for event in provider.stream(request)]

    return asyncio.run(run())


def test_streams_text_usage_and_finish_with_key_only_in_header():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["headers"] = request.headers
        seen["body"] = json.loads(request.content)
        return httpx.Response(200, content=sse(
            text_chunk("Hel"),
            {**text_chunk("lo", finishReason="STOP"),
             "usageMetadata": {"promptTokenCount": 100, "candidatesTokenCount": 5, "thoughtsTokenCount": 3}},
        ), headers={"content-type": "text/event-stream"})

    events = collect(provider_for(handler), make_request())

    assert [e.text for e in events if isinstance(e, TextDelta)] == ["Hel", "lo"]
    usage = next(e for e in events if isinstance(e, Usage))
    assert (usage.input_tokens, usage.output_tokens) == (100, 8)
    assert events[-1].stop_reason == STOP_END

    assert seen["url"].startswith(
        "https://aiplatform.googleapis.com/v1/publishers/google/models/"
        "gemini-3.1-flash-lite:streamGenerateContent"
    )
    assert "alt=sse" in seen["url"]
    assert KEY not in seen["url"]
    assert seen["headers"]["x-goog-api-key"] == KEY
    body = seen["body"]
    assert [p["text"] for p in body["systemInstruction"]["parts"]] == ["SYSTEM A", "SYSTEM B"]
    # Visitor context rides in the newest user turn, never in the system prompt.
    assert body["contents"] == [{"role": "user", "parts": [
        {"text": "<visitor_context>now</visitor_context>"}, {"text": "Hi"},
    ]}]
    assert body["generationConfig"]["maxOutputTokens"] == 256


def test_tool_call_keeps_thought_signature_and_round_trips():
    def handler(request):
        return httpx.Response(200, content=sse({
            "candidates": [{
                "content": {"role": "model", "parts": [{
                    "functionCall": {"name": "open_modal", "args": {"kind": "skill", "key": "python"}},
                    "thoughtSignature": "SIG-abc==",
                }]},
                "finishReason": "STOP",
            }],
        }))

    events = collect(provider_for(handler), make_request())
    (call,) = [e for e in events if isinstance(e, ToolCall)]
    assert call.name == "open_modal"
    assert call.args == {"kind": "skill", "key": "python"}
    assert call.provider_state == {"thoughtSignature": "SIG-abc=="}
    assert events[-1].stop_reason == STOP_TOOL_USE

    # Next turn: the signature is echoed back unchanged, with a functionResponse.
    followup = make_request(messages=[
        {"role": "user", "text": "show python"},
        {"role": "assistant", "text": "", "tool_calls": [call]},
        {"role": "tool", "results": [{"call_id": call.id, "name": "open_modal", "output": {"ok": True}}]},
    ])
    contents = build_body(followup)["contents"]
    assert contents[1] == {"role": "model", "parts": [{
        "functionCall": {"name": "open_modal", "args": {"kind": "skill", "key": "python"}},
        "thoughtSignature": "SIG-abc==",
    }]}
    assert contents[2] == {"role": "user", "parts": [
        {"functionResponse": {"name": "open_modal", "response": {"ok": True}}},
    ]}


def test_thought_parts_are_not_shown_to_the_visitor():
    def handler(request):
        return httpx.Response(200, content=sse({"candidates": [{"content": {"parts": [
            {"text": "internal reasoning", "thought": True}, {"text": "Visible"},
        ]}, "finishReason": "STOP"}]}))

    events = collect(provider_for(handler), make_request())
    assert [e.text for e in events if isinstance(e, TextDelta)] == ["Visible"]


@pytest.mark.parametrize(("status", "error"), [
    (401, ProviderAuthError), (403, ProviderAuthError),
    (429, ProviderRateLimited), (500, ProviderUnavailable), (503, ProviderUnavailable),
    (400, ProviderError),
])
def test_http_errors_map_to_provider_errors_without_leaking_text(status, error):
    def handler(request):
        return httpx.Response(status, json={"error": {"message": f"echo {KEY} secret detail"}})

    with pytest.raises(error) as info:
        collect(provider_for(handler), make_request())
    assert KEY not in str(info.value)
    assert "secret detail" not in str(info.value)


def test_timeouts_and_connection_errors_are_unavailable():
    def timeout(request):
        raise httpx.ReadTimeout(f"timed out calling with {KEY}", request=request)

    def refused(request):
        raise httpx.ConnectError(f"refused {KEY}", request=request)

    for handler in (timeout, refused):
        with pytest.raises(ProviderUnavailable) as info:
            collect(provider_for(handler), make_request())
        assert KEY not in str(info.value)
        assert info.value.__cause__ is None


@pytest.mark.parametrize("chunk", [
    text_chunk("", finishReason="SAFETY"),
    {"promptFeedback": {"blockReason": "PROHIBITED_CONTENT"}},
])
def test_safety_blocks_are_reported_as_blocked(chunk):
    def handler(request):
        return httpx.Response(200, content=sse(chunk))

    events = collect(provider_for(handler), make_request())
    assert events[-1].stop_reason == STOP_BLOCKED


def test_max_tokens_finish_reason():
    def handler(request):
        return httpx.Response(200, content=sse(text_chunk("cut", finishReason="MAX_TOKENS")))

    events = collect(provider_for(handler), make_request())
    assert events[-1].stop_reason == STOP_MAX_TOKENS


def test_malformed_sse_lines_are_skipped():
    def handler(request):
        body = b": keepalive\r\n\r\ndata: {not json\r\n\r\n" + sse(text_chunk("ok", finishReason="STOP"))
        return httpx.Response(200, content=body)

    events = collect(provider_for(handler), make_request())
    assert [e.text for e in events if isinstance(e, TextDelta)] == ["ok"]


def test_tool_schemas_convert_to_the_gemini_subset():
    declarations = {d["name"]: d for d in to_function_declarations(CHAT_TOOLS)}
    assert set(declarations) == {t["name"] for t in CHAT_TOOLS}
    nav = declarations["navigate_section"]["parameters"]
    assert nav["type"] == "OBJECT"
    assert nav["properties"]["section"]["type"] == "STRING"
    assert "additionalProperties" not in json.dumps(declarations)
    # An empty OBJECT schema is rejected by Gemini, so it is omitted.
    assert "parameters" not in declarations["download_resume"]


def test_plan_models_retries_primary_once_then_falls_back():
    provider = provider_for(lambda r: httpx.Response(200))
    assert provider.plan_models("a", "b") == ["a", "a", "b"]
    assert provider.plan_models("a", "a") == ["a", "a"]
