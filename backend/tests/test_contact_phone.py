"""POST /api/contact/phone: the phone number is revealed only after a visitor
leaves an email address, and only once the owner has been notified.

The number is not in git (contact.json, the model example, the prompt) and
not in the public /api/contact/info payload. SendGrid is faked at the client
boundary; no test talks to a real provider.
"""
import dataclasses
import types

import pytest

from backend.app import config
from backend.app.api import contact_routes
from backend.app.services import owner_mail

DUMMY_PHONE = "555-0100"


class FakeSendGrid:
    """Captures Mail objects; status or exception is configurable per test."""

    sent: list = []
    status_code = 202
    raises: Exception | None = None

    def __init__(self, _api_key):
        pass

    def send(self, message):
        if FakeSendGrid.raises is not None:
            raise FakeSendGrid.raises
        FakeSendGrid.sent.append(message)
        return types.SimpleNamespace(status_code=FakeSendGrid.status_code)


@pytest.fixture(autouse=True)
def _isolate(monkeypatch):
    contact_routes._phone_limiter.reset()
    FakeSendGrid.sent = []
    FakeSendGrid.status_code = 202
    FakeSendGrid.raises = None
    monkeypatch.setattr(owner_mail, "SendGridAPIClient", FakeSendGrid)
    yield
    contact_routes._phone_limiter.reset()


def _with_settings(monkeypatch, **overrides):
    settings = dataclasses.replace(config.get_settings(), **overrides)
    monkeypatch.setattr(contact_routes, "get_settings", lambda: settings)
    monkeypatch.setattr(owner_mail, "get_settings", lambda: settings)
    return settings


def _plain_body(message) -> str:
    return next(c.content for c in message.contents if c.mime_type == "text/plain")


def test_unset_phone_is_503_and_sends_nothing(client, monkeypatch):
    _with_settings(monkeypatch, contact_phone="")
    response = client.post("/api/contact/phone", json={"email": "visitor@example.com"})

    assert response.status_code == 503
    assert response.json()["detail"] == contact_routes.PHONE_UNAVAILABLE_DETAIL
    assert "phone" not in response.json()
    assert FakeSendGrid.sent == []


def test_default_test_environment_has_no_phone(client):
    """conftest forces CONTACT_PHONE empty so a real number never leaks in."""
    assert config.get_settings().contact_phone == ""
    response = client.post("/api/contact/phone", json={"email": "visitor@example.com"})
    assert response.status_code == 503


@pytest.mark.parametrize(
    "body",
    [
        {"email": "not-an-email"},
        {"email": ""},
        {"email": "a" * 250 + "@example.com"},
        {},
        {"email": 12345},
    ],
)
def test_invalid_email_is_422_and_sends_nothing(client, monkeypatch, body):
    _with_settings(monkeypatch, contact_phone=DUMMY_PHONE)
    response = client.post("/api/contact/phone", json=body)

    assert response.status_code == 422
    assert DUMMY_PHONE not in response.text
    assert FakeSendGrid.sent == []


def test_success_returns_phone_after_notifying_the_owner(client, monkeypatch):
    _with_settings(monkeypatch, contact_phone=DUMMY_PHONE)
    response = client.post("/api/contact/phone", json={"email": "visitor@example.com"})

    assert response.status_code == 200
    assert response.json() == {"phone": DUMMY_PHONE}
    assert response.headers["cache-control"] == "no-store"

    assert len(FakeSendGrid.sent) == 1
    mail = FakeSendGrid.sent[0]
    recipients = [entry["email"] for p in mail.personalizations for entry in p.tos]
    assert recipients == ["admin@example.com"]
    assert mail.subject.subject == "Phone number requested via portfolio"
    body = _plain_body(mail)
    assert "visitor@example.com" in body
    assert "UTC" in body
    # The notification is about the request; it does not need the number.
    assert DUMMY_PHONE not in body
    assert mail.reply_to.email == "visitor@example.com"


def test_send_runs_off_the_event_loop(client, monkeypatch):
    import threading

    seen = {}

    class ThreadRecorder(FakeSendGrid):
        def send(self, message):
            seen["thread"] = threading.current_thread()
            return super().send(message)

    monkeypatch.setattr(owner_mail, "SendGridAPIClient", ThreadRecorder)
    _with_settings(monkeypatch, contact_phone=DUMMY_PHONE)
    assert client.post("/api/contact/phone", json={"email": "v@example.com"}).status_code == 200
    assert seen["thread"] is not threading.main_thread()


def test_sendgrid_exception_is_502_without_phone(client, monkeypatch):
    _with_settings(monkeypatch, contact_phone=DUMMY_PHONE)
    FakeSendGrid.raises = RuntimeError("provider internals: account 42")
    response = client.post("/api/contact/phone", json={"email": "visitor@example.com"})

    assert response.status_code == 502
    assert DUMMY_PHONE not in response.text
    assert "provider internals" not in response.text
    assert response.headers["cache-control"] == "no-store"


def test_sendgrid_non_2xx_is_502_without_phone(client, monkeypatch):
    _with_settings(monkeypatch, contact_phone=DUMMY_PHONE)
    FakeSendGrid.status_code = 401
    response = client.post("/api/contact/phone", json={"email": "visitor@example.com"})

    assert response.status_code == 502
    assert DUMMY_PHONE not in response.text


def test_missing_sendgrid_config_is_503_without_phone(client, monkeypatch):
    _with_settings(monkeypatch, contact_phone=DUMMY_PHONE, sendgrid_api_key="")
    response = client.post("/api/contact/phone", json={"email": "visitor@example.com"})

    assert response.status_code == 503
    assert DUMMY_PHONE not in response.text
    assert FakeSendGrid.sent == []


def test_phone_requests_are_rate_limited_per_ip(client, monkeypatch):
    _with_settings(monkeypatch, contact_phone=DUMMY_PHONE)
    limit = contact_routes._phone_limiter.max_events
    for _ in range(limit):
        assert client.post("/api/contact/phone", json={"email": "v@example.com"}).status_code == 200

    response = client.post("/api/contact/phone", json={"email": "v@example.com"})
    assert response.status_code == 429
    assert DUMMY_PHONE not in response.text
    assert len(FakeSendGrid.sent) == limit


def test_phone_limiter_has_a_global_ceiling():
    assert contact_routes._phone_limiter.global_max_events <= 60
    assert contact_routes._phone_limiter is not contact_routes._email_limiter


def test_public_contact_info_has_no_phone(client):
    response = client.get("/api/contact/info")

    assert response.status_code == 200
    assert "phone" not in response.json()
    assert "phone" not in contact_routes.Contact.model_json_schema()["properties"]
