"""POST /api/contact/send-email failure paths. SendGrid is faked at the client
boundary; nothing here touches the network."""
import dataclasses
import types

import pytest

from backend.app import config
from backend.app.api import contact_routes
from backend.app.services import owner_mail

PAYLOAD = {"from_email": "someone@example.com", "subject": "Hello", "message": "body"}


class FakeSendGrid:
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
    contact_routes._email_limiter.reset()
    FakeSendGrid.sent = []
    FakeSendGrid.status_code = 202
    FakeSendGrid.raises = None
    monkeypatch.setattr(owner_mail, "SendGridAPIClient", FakeSendGrid)
    yield
    contact_routes._email_limiter.reset()


def _with_settings(monkeypatch, **overrides):
    settings = dataclasses.replace(config.get_settings(), **overrides)
    monkeypatch.setattr(contact_routes, "get_settings", lambda: settings)
    monkeypatch.setattr(owner_mail, "get_settings", lambda: settings)


def test_success_reports_provider_status(client):
    FakeSendGrid.status_code = 200
    response = client.post("/api/contact/send-email", json=PAYLOAD)
    assert response.status_code == 200
    assert response.json() == {"message": "Email sent successfully", "status_code": 200}


def test_provider_exception_is_502_and_does_not_leak_details(client):
    FakeSendGrid.raises = RuntimeError("secret-account-detail sg-key-123")
    response = client.post("/api/contact/send-email", json=PAYLOAD)
    assert response.status_code == 502
    assert response.json()["detail"] == contact_routes.EMAIL_SEND_FAILED_DETAIL
    assert "secret-account-detail" not in response.text


@pytest.mark.parametrize("status", [400, 401, 429, 500, 199, 300])
def test_non_2xx_provider_status_is_502(client, status):
    FakeSendGrid.status_code = status
    response = client.post("/api/contact/send-email", json=PAYLOAD)
    assert response.status_code == 502
    assert response.json()["detail"] == contact_routes.EMAIL_SEND_FAILED_DETAIL
    assert FakeSendGrid.sent  # the send was attempted, then judged failed


@pytest.mark.parametrize("override", [{"sendgrid_api_key": ""}, {"admin_email": ""}])
def test_missing_mail_config_is_500_and_sends_nothing(client, monkeypatch, override):
    _with_settings(monkeypatch, **override)
    response = client.post("/api/contact/send-email", json=PAYLOAD)
    assert response.status_code == 500
    assert response.json()["detail"] == "Email is not configured on this server"
    assert FakeSendGrid.sent == []


@pytest.mark.parametrize(
    "body",
    [
        {**PAYLOAD, "from_email": "not-an-email"},
        {**PAYLOAD, "subject": ""},
        {**PAYLOAD, "message": ""},
        {**PAYLOAD, "message": "x" * 5001},
        {"from_email": PAYLOAD["from_email"], "subject": "Hello"},
    ],
)
def test_invalid_bodies_are_422_and_send_nothing(client, body):
    assert client.post("/api/contact/send-email", json=body).status_code == 422
    assert FakeSendGrid.sent == []


def test_rate_limited_requests_do_not_send(client):
    statuses = [client.post("/api/contact/send-email", json=PAYLOAD).status_code for _ in range(4)]
    assert statuses == [200, 200, 200, 429]
    assert len(FakeSendGrid.sent) == 3


def test_reply_to_is_the_visitor_and_subject_is_single_line(client):
    client.post(
        "/api/contact/send-email",
        json={**PAYLOAD, "subject": "Hi there\r\n  friend"},
    )
    message = FakeSendGrid.sent[0]
    assert message.subject.subject == "Jordan Kail: Hi there friend"
    assert message.reply_to.email == "someone@example.com"


def test_company_in_notification_and_phone_after_delivery(client, monkeypatch):
    _with_settings(monkeypatch, contact_phone="+12025550100")
    response = client.post("/api/contact/send-email", json={**PAYLOAD, "company": " Example <Labs>\n Team "})
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["phone"] == "+12025550100"
    sent = FakeSendGrid.sent[0]
    bodies = {part.mime_type: part.content for part in sent.contents}
    assert "Company: Example <Labs> Team" in bodies["text/plain"]
    assert "Example &lt;Labs&gt; Team" in bodies["text/html"]
    assert "Example <Labs>" not in bodies["text/html"]
    assert sent.reply_to.email == PAYLOAD["from_email"]


def test_failed_delivery_never_reveals_phone(client, monkeypatch):
    _with_settings(monkeypatch, contact_phone="+12025550100")
    FakeSendGrid.status_code = 500
    response = client.post("/api/contact/send-email", json={**PAYLOAD, "company": "Example Labs"})
    assert response.status_code == 502
    assert response.headers["cache-control"] == "no-store"
    assert "phone" not in response.json()
    assert "+12025550100" not in response.text


@pytest.mark.parametrize("extra", [{"company": " "}, {"company": "x" * 151}, {"subject": " "}, {"message": "\n "}])
def test_blank_and_oversized_fields_send_nothing(client, extra):
    response = client.post("/api/contact/send-email", json={**PAYLOAD, **extra})
    assert response.status_code == 422
    assert response.headers["cache-control"] == "no-store"
    assert FakeSendGrid.sent == []
