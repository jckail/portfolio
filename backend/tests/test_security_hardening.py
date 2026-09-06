"""Regression tests for the abuse/injection fixes on public endpoints.

Each test here pins a specific vulnerability that was live in this codebase,
so a future refactor that reintroduces one fails loudly.
"""
import os
import uuid

import pytest
from starlette.websockets import WebSocketDisconnect

from backend.app.api import contact_routes, telemetry_routes
from backend.app.api.telemetry_routes import get_log_file_path
from backend.app.services import chat_service


@pytest.fixture(autouse=True)
def _reset_limiters():
    """Rate limits are process-wide; keep tests independent of each other."""
    contact_routes._email_limiter.reset()
    telemetry_routes._ingest_limiter.reset()
    chat_service.manager.reset_limits()
    yield
    contact_routes._email_limiter.reset()
    telemetry_routes._ingest_limiter.reset()
    chat_service.manager.reset_limits()


class FakeSendGridResponse:
    status_code = 202


class FakeSendGridClient:
    """Captures the Mail object instead of talking to SendGrid."""

    sent: list = []

    def __init__(self, _api_key):
        pass

    def send(self, message):
        FakeSendGridClient.sent.append(message)
        return FakeSendGridResponse()


@pytest.fixture
def captured_mail(monkeypatch):
    FakeSendGridClient.sent = []
    monkeypatch.setattr(contact_routes, "SendGridAPIClient", FakeSendGridClient)
    return FakeSendGridClient.sent


# --- Contact form: open relay + HTML injection ------------------------------

def test_contact_form_never_mails_the_submitter(client, captured_mail):
    """The submitter's address must not become a recipient.

    Treating it as one turned a domain-verified sender into an open relay:
    anyone could have SendGrid deliver arbitrary content to any address,
    signed by our SPF/DKIM.
    """
    response = client.post(
        "/api/contact/send-email",
        json={
            "from_email": "victim@example.com",
            "subject": "Action required",
            "message": "click here",
        },
    )

    assert response.status_code == 200
    assert len(captured_mail) == 1
    recipients = [
        personalization.tos for personalization in captured_mail[0].personalizations
    ]
    flattened = [entry["email"] for group in recipients for entry in group]
    assert flattened == ["admin@example.com"]
    assert "victim@example.com" not in flattened
    # Replies still reach the visitor without addressing mail to them.
    assert captured_mail[0].reply_to.email == "victim@example.com"


def test_contact_form_escapes_html_in_the_body(client, captured_mail):
    response = client.post(
        "/api/contact/send-email",
        json={
            "from_email": "someone@example.com",
            "subject": "Hello",
            "message": '<a href="https://evil.tld">Re-authenticate</a>',
        },
    )

    assert response.status_code == 200
    html_body = next(
        content.content
        for content in captured_mail[0].contents
        if content.mime_type == "text/html"
    )
    assert "&lt;a href=" in html_body
    assert '<a href="https://evil.tld"' not in html_body


def test_contact_form_strips_newlines_from_the_subject(client, captured_mail):
    client.post(
        "/api/contact/send-email",
        json={
            "from_email": "someone@example.com",
            "subject": "Hi\r\nBcc: everyone@example.com",
            "message": "body",
        },
    )
    subject = captured_mail[0].subject.subject
    assert "\r" not in subject and "\n" not in subject


def test_contact_form_rejects_oversized_fields(client, captured_mail):
    response = client.post(
        "/api/contact/send-email",
        json={
            "from_email": "someone@example.com",
            "subject": "x" * 200,
            "message": "body",
        },
    )
    assert response.status_code == 422
    assert captured_mail == []


def test_contact_form_is_rate_limited(client, captured_mail):
    payload = {
        "from_email": "someone@example.com",
        "subject": "Hello",
        "message": "body",
    }
    statuses = [
        client.post("/api/contact/send-email", json=payload).status_code
        for _ in range(5)
    ]
    assert statuses.count(429) >= 1, statuses


# --- Telemetry: path traversal + validation ---------------------------------

@pytest.mark.parametrize(
    "hostile",
    [
        "../../../../../../tmp/pwn",
        "/app/backend/app/logs/app",
        "..",
        "",
        None,
        "not-a-uuid",
    ],
)
def test_log_path_never_escapes_the_log_directory(hostile):
    """The session id is attacker-controlled and names a file on disk."""
    path = get_log_file_path(hostile)
    assert path.endswith("unknown_session.log")
    # The base directory is itself built with a ".." segment, so compare
    # resolved paths rather than looking for ".." in the string.
    expected_dir = os.path.realpath(os.path.dirname(get_log_file_path(str(uuid.uuid4()))))
    assert os.path.dirname(os.path.realpath(path)) == expected_dir


def test_log_path_accepts_a_real_uuid():
    session = str(uuid.uuid4())
    assert get_log_file_path(session).endswith(f"{session}.log")


def test_log_endpoint_rejects_a_non_uuid_session(client):
    response = client.post(
        "/api/log",
        json={"sessionUUID": "../../../etc/passwd", "message": "hello"},
    )
    # Previously returned 200 with an error body, making rejected logs
    # indistinguishable from stored ones.
    assert response.status_code == 400


def test_log_batch_rejects_oversized_batches(client):
    response = client.post(
        "/api/log/batch",
        json={
            "logs": [
                {"sessionUUID": str(uuid.uuid4()), "message": "x"} for _ in range(60)
            ]
        },
    )
    assert response.status_code == 413


def test_telemetry_rejects_oversized_bodies(client):
    response = client.post(
        "/api/telemetry",
        json={"sessionUUID": str(uuid.uuid4()), "blob": "x" * 100_000},
    )
    assert response.status_code == 413


# --- Chat WebSocket: origin, session id, collisions -------------------------

def test_websocket_rejects_a_foreign_origin(client):
    """CORSMiddleware never runs for WebSocket scopes, so the handshake has
    to check Origin itself or any site can spend our Anthropic budget."""
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(
            "/ws/origin-test-client", headers={"origin": "https://evil.tld"}
        ) as ws:
            ws.receive_text()


def test_websocket_accepts_an_allowed_origin(client):
    with client.websocket_connect(
        "/ws/origin-ok-client", headers={"origin": "http://localhost:5173"}
    ) as ws:
        ws.send_json({"type": "context", "content": "hello"})
    assert chat_service.manager.get_context("origin-ok-client") == ""


def test_websocket_rejects_a_malformed_client_id(client):
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws/short") as ws:
            ws.receive_text()


def test_websocket_refuses_to_displace_a_live_session(client):
    """A second socket claiming a live id used to silently take over the
    first one's reply stream and page context."""
    with client.websocket_connect("/ws/dup-test-client") as first:
        first.send_json({"type": "context", "content": "original"})
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect("/ws/dup-test-client") as second:
                second.receive_text()


def test_websocket_does_not_inherit_a_previous_page_context(client):
    with client.websocket_connect("/ws/context-reuse-client") as ws:
        ws.send_json({"type": "context", "content": "secret page text"})
    # Reconnecting with the same id must start clean.
    with client.websocket_connect("/ws/context-reuse-client") as ws:
        ws.send_json({"type": "message", "content": ""})
    assert "secret" not in chat_service.manager.get_context("context-reuse-client")


def test_ip_rate_limit_survives_reconnect():
    """Per-connection counters were cleared on disconnect, so reconnecting
    reset the budget. The peer-keyed limiter must not."""
    manager = chat_service.ConnectionManager()
    peer = "203.0.113.7"
    for _ in range(chat_service.IP_RATE_LIMIT_MAX_MESSAGES):
        assert manager.is_ip_rate_limited(peer) is False
    assert manager.is_ip_rate_limited(peer) is True

    manager.disconnect("whatever")
    assert manager.is_ip_rate_limited(peer) is True
