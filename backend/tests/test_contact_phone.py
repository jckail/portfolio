"""Retired email-only phone reveal never sends mail or discloses a number."""
import dataclasses
from unittest.mock import AsyncMock

import pytest

from backend.app import config
from backend.app.api import contact_routes


@pytest.mark.parametrize("body", [{}, {"email": "visitor@example.com"}, {"email": "invalid"}, {"company": "Example"}])
def test_retired_endpoint_is_gone_without_mail_or_phone(client, monkeypatch, body):
    settings = dataclasses.replace(config.get_settings(), contact_phone="555-0100")
    monkeypatch.setattr(contact_routes, "get_settings", lambda: settings)
    send = AsyncMock()
    monkeypatch.setattr(contact_routes, "send_owner_mail", send)
    response = client.post("/api/contact/phone", json=body)
    assert response.status_code == 410
    assert response.headers["cache-control"] == "no-store"
    assert "contact form" in response.json()["detail"]
    assert "555-0100" not in response.text
    send.assert_not_awaited()


def test_public_contact_info_has_no_phone(client):
    response = client.get("/api/contact/info")
    assert response.status_code == 200
    assert "phone" not in response.json()
    assert "phone" not in contact_routes.Contact.model_json_schema()["properties"]
