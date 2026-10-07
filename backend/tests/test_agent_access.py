"""Access receipts follow accepted notification and enforce the socket gate."""
import dataclasses

import pytest
from starlette.websockets import WebSocketDisconnect

from backend.app import config
from backend.app.api import agent_access_routes, chat_routes
from backend.app.services import agent_access
from backend.app.services.llm import TextDelta
from backend.app.services.owner_mail import OwnerMailFailed

from .test_chat_tools_ws import round_of, say, script


@pytest.fixture(autouse=True)
def isolate(monkeypatch):
    settings = dataclasses.replace(config.get_settings(), admin_email="jckail13@gmail.com", agent_access_required=True)
    monkeypatch.setattr(config, "get_settings", lambda: settings)
    monkeypatch.setattr(agent_access, "get_settings", lambda: settings)
    monkeypatch.setattr(agent_access_routes, "get_settings", lambda: settings)
    monkeypatch.setattr(chat_routes, "get_settings", lambda: settings)
    agent_access_routes._access_limiter.reset()
    yield
    agent_access_routes._access_limiter.reset()


def test_notification_precedes_receipt_and_escapes_visitor_text(client, monkeypatch):
    sent = []
    async def send(**kwargs):
        sent.append(kwargs)
        return 202
    monkeypatch.setattr(agent_access_routes, "send_owner_mail", send)
    result = client.post("/api/agent/access", json={"email": "visitor@example.com", "company": "<Research & Co>"})
    assert result.status_code == 200
    assert len(sent) == 1 and sent[0]["reply_to"] == "visitor@example.com"
    assert "&lt;Research &amp; Co&gt;" in sent[0]["html"]
    assert "not verified" in sent[0]["plain_text"]
    token = result.json()["token"]
    assert "visitor" not in token and "Research" not in token
    assert result.headers["cache-control"] == "no-store"
    checked = client.get("/api/agent/access", headers={"Authorization": f"Bearer {token}"})
    assert checked.status_code == 200 and checked.json()["valid"] is True


def test_failed_notification_grants_no_access(client, monkeypatch):
    async def fail(**kwargs):
        raise OwnerMailFailed
    monkeypatch.setattr(agent_access_routes, "send_owner_mail", fail)
    result = client.post("/api/agent/access", json={"email": "visitor@example.com", "company": "Co"})
    assert result.status_code == 502 and "token" not in result.json()
    assert result.headers["cache-control"] == "no-store"


@pytest.mark.parametrize("body", [{"email": "wrong", "company": "Co"}, {"email": "a@example.com", "company": "   "},
                                   {"email": "a@example.com", "company": "Co", "recipient": "other@example.com"}])
def test_invalid_entry_cannot_notify(client, monkeypatch, body):
    async def fail(**kwargs):
        pytest.fail("Invalid entry reached email")
    monkeypatch.setattr(agent_access_routes, "send_owner_mail", fail)
    assert client.post("/api/agent/access", json=body).status_code == 422


def test_receipt_tampering_and_expiry_are_rejected(monkeypatch):
    token, expires = agent_access.issue_access()
    assert agent_access.verify_access(token) == expires
    assert agent_access.verify_access(token + "x") is None
    assert agent_access.verify_access("invalid") is None
    monkeypatch.setattr(agent_access.time, "time", lambda: expires)
    assert agent_access.verify_access(token) is None


def test_socket_rejects_message_without_receipt(client, monkeypatch):
    provider = script(monkeypatch, round_of(TextDelta("Should not run")))
    with client.websocket_connect("/ws/access-boundary-1") as ws:
        ws.send_json({"type": "message", "content": "hello"})
        with pytest.raises(WebSocketDisconnect) as exc:
            ws.receive_json()
        assert exc.value.code == 1008
    assert provider.requests == []


def test_socket_accepts_receipt_before_model_request(client, monkeypatch):
    provider = script(monkeypatch, round_of(TextDelta("Allowed")))
    token, _ = agent_access.issue_access()
    with client.websocket_connect("/ws/access-boundary-2") as ws:
        ws.send_json({"type": "access", "token": token})
        frames = say(ws)
    assert len(provider.requests) == 1
    assert "Allowed" in "".join(f.get("message", "") for f in frames)
