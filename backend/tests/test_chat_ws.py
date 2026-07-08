"""Integration tests for the chat WebSocket protocol with Anthropic mocked."""
import copy
import json
from types import SimpleNamespace

from backend.app.api import chat_routes


class FakeStream:
    def __init__(self, chunks):
        self._chunks = chunks

    @property
    def text_stream(self):
        async def generate():
            for chunk in self._chunks:
                yield chunk

        return generate()


class FakeStreamContext:
    def __init__(self, chunks):
        self._chunks = chunks

    async def __aenter__(self):
        return FakeStream(self._chunks)

    async def __aexit__(self, exc_type, exc, tb):
        return False


class FakeMessages:
    """Stands in for AsyncAnthropic().messages, capturing call kwargs."""

    def __init__(self, chunks):
        self._chunks = chunks
        self.calls = []

    def stream(self, **kwargs):
        # Deep-copy: the manager mutates the history list after this call
        self.calls.append(copy.deepcopy(kwargs))
        return FakeStreamContext(self._chunks)


def make_fake_anthropic(chunks):
    messages = FakeMessages(chunks)
    return SimpleNamespace(messages=messages), messages


def test_chat_status_reports_available(client):
    response = client.get("/api/chat/status")
    assert response.status_code == 200
    assert response.json() == {"available": True}


def test_websocket_streams_chunks_then_completion_frame(client, monkeypatch):
    fake_client, messages = make_fake_anthropic(["Hello", " from", " Claude"])
    monkeypatch.setattr(chat_routes.manager, "client", fake_client)

    with client.websocket_connect("/ws/ws-test-stream") as ws:
        ws.send_text(json.dumps({
            "type": "context",
            "content": json.dumps({"text": "Visitor is on the About page"}),
        }))
        ws.send_text(json.dumps({"type": "message", "content": "Tell me about Jordan"}))

        frames = []
        while True:
            frame = ws.receive_json()
            frames.append(frame)
            if not frame["is_chunk"]:
                break

    chunks = [f["message"] for f in frames if f["is_chunk"]]
    assert "".join(chunks) == "Hello from Claude"
    # Completion frame is empty: the client already has the streamed text
    assert frames[-1] == {"message": "", "sender": "assistant", "is_chunk": False}

    # The page context sent before the message made it into the system prompt
    (call,) = messages.calls
    system_text = " ".join(block["text"] for block in call["system"])
    assert "Visitor is on the About page" in system_text
    # And the user message is in the conversation history
    assert call["messages"][-1] == {"role": "user", "content": "Tell me about Jordan"}


def test_websocket_keeps_conversation_history(client, monkeypatch):
    fake_client, messages = make_fake_anthropic(["Answer"])
    monkeypatch.setattr(chat_routes.manager, "client", fake_client)

    with client.websocket_connect("/ws/ws-test-history") as ws:
        for text in ("First question", "Second question"):
            ws.send_text(json.dumps({"type": "message", "content": text}))
            while True:
                if not ws.receive_json()["is_chunk"]:
                    break

    second_call = messages.calls[1]
    roles = [m["role"] for m in second_call["messages"]]
    assert roles == ["user", "assistant", "user"]
    assert second_call["messages"][0]["content"] == "First question"
    assert second_call["messages"][1]["content"] == "Answer"
    assert second_call["messages"][2]["content"] == "Second question"


def test_websocket_rejects_oversized_message(client, monkeypatch):
    fake_client, messages = make_fake_anthropic(["should not be called"])
    monkeypatch.setattr(chat_routes.manager, "client", fake_client)

    huge = "x" * (chat_routes.MAX_USER_MESSAGE_CHARS + 1)
    with client.websocket_connect("/ws/ws-test-toolong") as ws:
        ws.send_text(json.dumps({"type": "message", "content": huge}))
        frame = ws.receive_json()

    assert frame["is_chunk"] is False
    assert "long" in frame["message"].lower()
    assert messages.calls == []


def test_websocket_rate_limits_rapid_messages(client, monkeypatch):
    fake_client, _ = make_fake_anthropic(["ok"])
    monkeypatch.setattr(chat_routes.manager, "client", fake_client)

    with client.websocket_connect("/ws/ws-test-ratelimit") as ws:
        for _ in range(chat_routes.RATE_LIMIT_MAX_MESSAGES):
            ws.send_text(json.dumps({"type": "message", "content": "hi"}))
            while True:
                if not ws.receive_json()["is_chunk"]:
                    break

        ws.send_text(json.dumps({"type": "message", "content": "one too many"}))
        frame = ws.receive_json()

    assert frame["is_chunk"] is False
    assert "quickly" in frame["message"].lower()


def test_websocket_recovers_from_anthropic_error(client, monkeypatch):
    class BrokenMessages:
        def stream(self, **kwargs):
            raise RuntimeError("api down")

    monkeypatch.setattr(
        chat_routes.manager, "client", SimpleNamespace(messages=BrokenMessages())
    )

    with client.websocket_connect("/ws/ws-test-error") as ws:
        ws.send_text(json.dumps({"type": "message", "content": "hello?"}))
        frame = ws.receive_json()

    assert frame["is_chunk"] is False
    assert "problem" in frame["message"].lower() or "apologize" in frame["message"].lower()
    # The failed user turn was rolled back so a retry starts clean
    assert chat_routes.manager.get_history("ws-test-error") == []
