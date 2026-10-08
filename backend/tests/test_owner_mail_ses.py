"""SES mail contract tested at its SDK boundary; no AWS calls or real mail."""
import asyncio
from dataclasses import replace
from unittest.mock import Mock

import pytest

from backend.app import config
from backend.app.api import agent_access_routes, contact_routes
from backend.app.services import agent_access, owner_mail


@pytest.fixture
def ses(monkeypatch):
    settings = replace(config.get_settings(), email_provider="ses", ses_region="us-west-2",
                       sendgrid_api_key="", contact_sender_email="assistant@example.com",
                       admin_email="jckail13@gmail.com")
    monkeypatch.setattr(owner_mail, "get_settings", lambda: settings)
    monkeypatch.setattr(agent_access_routes, "get_settings", lambda: settings)
    monkeypatch.setattr(agent_access, "get_settings", lambda: settings)
    client = Mock()
    client.send_email.return_value = {"MessageId": "synthetic-message", "ResponseMetadata": {"HTTPStatusCode": 200}}
    factory = Mock(return_value=client)
    monkeypatch.setattr(owner_mail.boto3, "client", factory)
    # A send failure never falls through to a second provider.
    sendgrid = Mock(side_effect=AssertionError("SendGrid must not be called"))
    monkeypatch.setattr(owner_mail, "SendGridAPIClient", sendgrid)
    return settings, client, factory


def send():
    return asyncio.run(owner_mail.send_owner_mail(subject="A role for Jordan", plain_text="Public test text",
                                           html="<p>Public test text</p>", reply_to="visitor@example.com",
                                           purpose="synthetic test"))


def test_ses_owner_only_utf8_reply_to_and_bounded_single_attempt(ses):
    settings, client, factory = ses
    assert owner_mail.owner_mail_configured()
    assert send() == 200
    factory.assert_called_once()
    args, kwargs = factory.call_args
    assert args == ("sesv2",) and kwargs["region_name"] == "us-west-2"
    assert kwargs["config"].retries == {"total_max_attempts": 1}
    assert kwargs["config"].connect_timeout == 3 and kwargs["config"].read_timeout == 8
    payload = client.send_email.call_args.kwargs
    assert payload["Destination"] == {"ToAddresses": [settings.admin_email]}
    assert payload["ReplyToAddresses"] == ["visitor@example.com"]
    assert payload["FromEmailAddress"] == "assistant@example.com"
    assert payload["Content"]["Simple"]["Subject"] == {"Data": "A role for Jordan", "Charset": "UTF-8"}
    assert payload["Content"]["Simple"]["Body"]["Text"]["Data"] == "Public test text"
    assert payload["Content"]["Simple"]["Body"]["Html"]["Charset"] == "UTF-8"


@pytest.mark.parametrize("result", [
    {}, {"MessageId": "id"}, {"ResponseMetadata": {"HTTPStatusCode": 200}},
    {"MessageId": "id", "ResponseMetadata": {"HTTPStatusCode": 500}},
    {"MessageId": "id", "ResponseMetadata": {"HTTPStatusCode": "200"}},
])
def test_ses_incomplete_or_rejected_acceptance_fails_closed(ses, result):
    _, client, _ = ses
    client.send_email.return_value = result
    with pytest.raises(owner_mail.OwnerMailFailed):
        send()
    client.send_email.assert_called_once()


def test_ses_exception_is_not_exposed_and_does_not_retry(ses, caplog):
    _, client, _ = ses
    client.send_email.side_effect = RuntimeError("private-provider-detail")
    with pytest.raises(owner_mail.OwnerMailFailed) as failure:
        send()
    assert "private-provider-detail" not in str(failure.value)
    assert "private-provider-detail" not in caplog.text
    client.send_email.assert_called_once()


@pytest.mark.parametrize("changes", [
    {"ses_region": ""}, {"admin_email": ""}, {"contact_sender_email": ""}, {"email_provider": "typo"},
])
def test_ses_missing_configuration_never_calls_provider(ses, monkeypatch, changes):
    settings, client, _ = ses
    monkeypatch.setattr(owner_mail, "get_settings", lambda: replace(settings, **changes))
    assert not owner_mail.owner_mail_configured()
    with pytest.raises(owner_mail.OwnerMailNotConfigured):
        send()
    client.send_email.assert_not_called()


@pytest.mark.parametrize("accepted", [True, False])
@pytest.mark.parametrize("route,payload", [
    ("/api/contact/send-email", {"from_email": "visitor@example.com", "subject": "Role", "message": "Hello"}),
    ("/api/agent/access", {"email": "visitor@example.com", "company": "Synthetic & Co"}),
])
def test_mounted_contact_and_introduction_use_ses_and_fail_closed(client, ses, route, payload, accepted):
    settings, mail_client, _ = ses
    contact_routes._email_limiter.reset()
    agent_access_routes._access_limiter.reset()
    if not accepted:
        mail_client.send_email.side_effect = RuntimeError("private-provider-detail")
    try:
        response = client.post(route, json=payload)
        assert response.status_code == (200 if accepted else 502)
        assert "private-provider-detail" not in response.text
        mail_client.send_email.assert_called_once()
        assert mail_client.send_email.call_args.kwargs["Destination"] == {"ToAddresses": [settings.admin_email]}
        if route == "/api/agent/access":
            assert ("token" in response.json()) is accepted
        else:
            assert mail_client.send_email.call_args.kwargs["Content"]["Simple"]["Subject"]["Data"] == "Jordan Kail: Role"
    finally:
        contact_routes._email_limiter.reset()
        agent_access_routes._access_limiter.reset()
