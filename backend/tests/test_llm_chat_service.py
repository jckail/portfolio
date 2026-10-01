"""chat_service driving a Vertex provider: failover, breaker, budget (no network)."""
import json

import httpx
import pytest

from backend.app.services import chat_service
from backend.app.services.llm import VertexGeminiProvider

from .test_llm_vertex import KEY, sse, text_chunk

PRIMARY = "gemini-3.1-flash-lite"
FALLBACK = "gemini-2.5-flash"


@pytest.fixture(autouse=True)
def _reset():
    chat_service.manager.reset_limits()
    yield
    chat_service.manager.reset_limits()


@pytest.fixture
def vertex(monkeypatch):
    """Point the shared manager at a Vertex provider with a scriptable transport."""
    state = {"models": [], "bodies": [], "handler": None}

    def dispatch(request: httpx.Request) -> httpx.Response:
        model = request.url.path.split("/models/")[1].split(":")[0]
        state["models"].append(model)
        state["bodies"].append(json.loads(request.content))
        return state["handler"](model, len(state["models"]))

    provider = VertexGeminiProvider(KEY, transport=httpx.MockTransport(dispatch))
    manager = chat_service.manager
    monkeypatch.setattr(manager, "provider", provider)
    monkeypatch.setattr(manager, "_model", PRIMARY)
    monkeypatch.setattr(manager, "_fallback_model", FALLBACK)
    monkeypatch.setattr(manager, "_retry_delay", 0)
    monkeypatch.setattr(manager, "_auth_failed_until", 0.0)
    monkeypatch.setattr(manager, "_tokens_used_today", 0)
    monkeypatch.setattr(manager, "_daily_token_budget", 1_000_000)
    return state


def ask(client, client_id, text="Hello"):
    frames = []
    with client.websocket_connect(f"/ws/{client_id}") as ws:
        ws.send_text(json.dumps({"type": "message", "content": text}))
        while True:
            frame = ws.receive_json()
            frames.append(frame)
            if frame.get("type") != "action" and not frame.get("is_chunk", True):
                return frames


def ok_stream(text="Hi there", tokens=(10, 5)):
    chunk = text_chunk(text, finishReason="STOP")
    chunk["usageMetadata"] = {"promptTokenCount": tokens[0], "candidatesTokenCount": tokens[1]}
    return httpx.Response(200, content=sse(chunk))


def test_streams_text_and_counts_tokens(client, vertex):
    vertex["handler"] = lambda model, n: ok_stream("Hello from Gemini", (100, 20))
    frames = ask(client, "vx-stream-1")
    assert "".join(f["message"] for f in frames if f["is_chunk"]) == "Hello from Gemini"
    assert frames[-1] == {"message": "", "sender": "assistant", "is_chunk": False}
    assert chat_service.manager._tokens_used_today == 120


def test_tool_call_emits_an_action_frame(client, vertex):
    vertex["handler"] = lambda model, n: httpx.Response(200, content=sse({"candidates": [{
        "content": {"parts": [{
            "functionCall": {"name": "open_modal", "args": {"kind": "skill", "key": "python"}},
            "thoughtSignature": "SIG",
        }]},
        "finishReason": "STOP",
    }]}))
    frames = ask(client, "vx-tool-1", "show me python")
    actions = [f for f in frames if f.get("type") == "action"]
    assert actions and actions[0]["action"] == "open_modal" and actions[0]["key"] == "python"


def test_5xx_retries_primary_then_falls_back_to_the_fallback_model(client, vertex):
    vertex["handler"] = lambda model, n: (
        httpx.Response(503) if model == PRIMARY else ok_stream("From fallback")
    )
    frames = ask(client, "vx-fallback-1")
    assert vertex["models"] == [PRIMARY, PRIMARY, FALLBACK]
    assert "".join(f["message"] for f in frames if f["is_chunk"]) == "From fallback"
    # A transient outage never trips the auth breaker.
    assert chat_service.manager.is_available() is True


def test_5xx_then_success_on_the_retry_stays_on_the_primary(client, vertex):
    vertex["handler"] = lambda model, n: httpx.Response(500) if n == 1 else ok_stream("Recovered")
    ask(client, "vx-retry-1")
    assert vertex["models"] == [PRIMARY, PRIMARY]


def test_all_attempts_failing_apologises_and_rolls_back_history(client, vertex):
    vertex["handler"] = lambda model, n: httpx.Response(502)
    (frame,) = ask(client, "vx-down-1")
    assert "problem" in frame["message"].lower()
    assert len(vertex["models"]) == 3
    assert chat_service.manager.get_history("vx-down-1") == []


@pytest.mark.parametrize("status", [401, 403])
def test_rejected_key_trips_the_breaker_and_status_goes_false(client, vertex, status):
    vertex["handler"] = lambda model, n: httpx.Response(status, json={"error": {"message": KEY}})
    assert client.get("/api/chat/status").json() == {"available": True}
    (frame,) = ask(client, f"vx-auth-{status}")
    assert "unavailable" in frame["message"].lower()
    assert KEY not in json.dumps(frame)
    assert len(vertex["models"]) == 1  # auth failures are not retried
    assert client.get("/api/chat/status").json() == {"available": False}
    (again,) = ask(client, f"vx-auth-{status}-b")
    assert "unavailable" in again["message"].lower()
    assert len(vertex["models"]) == 1  # no further provider calls while open


def test_429_is_a_friendly_busy_message_without_retry_or_breaker(client, vertex):
    vertex["handler"] = lambda model, n: httpx.Response(429)
    (frame,) = ask(client, "vx-429-1")
    assert "busy" in frame["message"].lower()
    assert len(vertex["models"]) == 1
    assert chat_service.manager.is_available() is True
    assert chat_service.manager.get_history("vx-429-1") == []


def test_safety_block_gets_a_graceful_message(client, vertex):
    vertex["handler"] = lambda model, n: httpx.Response(
        200, content=sse(text_chunk("", finishReason="SAFETY")))
    (frame,) = ask(client, "vx-safety-1")
    assert frame["message"] == chat_service.BLOCKED_MESSAGE
    assert chat_service.manager.get_history("vx-safety-1") == []


def test_empty_response_is_not_a_silent_success(client, vertex):
    vertex["handler"] = lambda model, n: httpx.Response(
        200, content=sse({"candidates": [{"content": {"parts": []}, "finishReason": "STOP"}]}))
    (frame,) = ask(client, "vx-empty-1")
    assert "problem" in frame["message"].lower()
    assert chat_service.manager.get_history("vx-empty-1") == []


def test_budget_exhaustion_disables_chat_and_status(client, vertex, monkeypatch):
    monkeypatch.setattr(chat_service.manager, "_daily_token_budget", 100)
    vertex["handler"] = lambda model, n: ok_stream("Last answer", (90, 20))
    ask(client, "vx-budget-1")
    assert client.get("/api/chat/status").json() == {"available": False}
    (frame,) = ask(client, "vx-budget-2")
    assert "unavailable" in frame["message"].lower()
    assert len(vertex["models"]) == 1  # the second message never reached Vertex


def test_mid_stream_drop_after_text_does_not_retry(client, vertex):
    class Boom(httpx.AsyncByteStream):
        async def __aiter__(self):
            yield sse(text_chunk("Partial"))
            raise httpx.ReadError("dropped")

    vertex["handler"] = lambda model, n: httpx.Response(200, stream=Boom())
    frames = ask(client, "vx-mid-1")
    assert [f["message"] for f in frames if f["is_chunk"]] == ["Partial"]
    assert "problem" in frames[-1]["message"].lower()
    assert len(vertex["models"]) == 1
    assert chat_service.manager.get_history("vx-mid-1") == []


def test_logs_never_contain_the_api_key(client, vertex, caplog):
    vertex["handler"] = lambda model, n: httpx.Response(401, json={"error": {"message": KEY}})
    with caplog.at_level("DEBUG"):
        ask(client, "vx-log-1")
    assert KEY not in caplog.text
