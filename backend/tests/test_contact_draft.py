"""Offline tests for reviewed contact introductions and their public route."""
import asyncio
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.app.api import contact_draft_routes as routes
from backend.app.services import contact_draft as service


@pytest.fixture
def draft_client(monkeypatch):
    routes._draft_limiter.reset()
    routes._daily_limiter.reset()
    fake = AsyncMock(return_value="Hi Jordan, could we discuss an engineering opportunity?")
    monkeypatch.setattr(routes, "recommend_contact_message", fake)
    app = FastAPI()
    app.include_router(routes.router, prefix="/api")
    with TestClient(app) as client:
        yield client, fake
    routes._draft_limiter.reset()
    routes._daily_limiter.reset()


@pytest.mark.parametrize("intent", ["opportunity", "collaboration", "question"])
def test_route_contract(draft_client, intent):
    client, fake = draft_client
    response = client.post("/api/contact/draft", json={"intent": intent})
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["message"].startswith("Hi Jordan")
    fake.assert_awaited_once_with(intent)


@pytest.mark.parametrize("body", [
    {}, {"intent": "write code"}, {"intent": "opportunity", "email": "private@example.com"},
    {"intent": "question", "company": "Private company"}, {"intent": ["question"]},
])
def test_route_rejects_arbitrary_input_without_echoing_it(draft_client, body):
    client, fake = draft_client
    response = client.post("/api/contact/draft", json=body)
    assert response.status_code == 422
    assert response.headers["cache-control"] == "no-store"
    assert "private@example.com" not in response.text
    fake.assert_not_awaited()


def test_route_per_address_quota(draft_client):
    client, fake = draft_client
    for _ in range(3):
        assert client.post("/api/contact/draft", json={"intent": "question"}).status_code == 200
    response = client.post("/api/contact/draft", json={"intent": "question"})
    assert response.status_code == 429
    assert response.headers["cache-control"] == "no-store"
    assert fake.await_count == 3


def test_route_global_quota_cannot_be_bypassed_by_address(draft_client, monkeypatch):
    client, fake = draft_client
    monkeypatch.setattr(routes, "client_ip", lambda request: str(fake.await_count))
    for _ in range(24):
        assert client.post("/api/contact/draft", json={"intent": "question"}).status_code == 200
    response = client.post("/api/contact/draft", json={"intent": "question"})
    assert response.status_code == 429
    assert response.headers["cache-control"] == "no-store"
    assert fake.await_count == 24


def test_route_daily_quota_survives_hourly_reset(draft_client):
    client, fake = draft_client
    for _ in range(2):
        for _ in range(3):
            assert client.post("/api/contact/draft", json={"intent": "question"}).status_code == 200
        routes._draft_limiter.reset()
    response = client.post("/api/contact/draft", json={"intent": "question"})
    assert response.status_code == 429
    assert fake.await_count == 6


def test_route_unavailable_is_honest_and_safe(draft_client):
    client, fake = draft_client
    fake.side_effect = service.DraftUnavailable("secret provider body")
    response = client.post("/api/contact/draft", json={"intent": "question"})
    assert response.status_code == 503
    assert response.headers["cache-control"] == "no-store"
    assert "secret provider" not in response.text



@pytest.mark.parametrize("intent", ["opportunity", "collaboration", "question"])
def test_reviewed_intro_works_without_model_configuration(intent, monkeypatch):
    from backend.app.services import chat_service
    monkeypatch.setattr(chat_service.manager, "provider", None)
    first = asyncio.run(service.recommend_contact_message(intent))
    assert asyncio.run(service.recommend_contact_message(intent)) == first
    assert first.startswith("Hi Jordan,")
    assert 0 < len(first) <= service.MAX_DRAFT_CHARS
    assert "following your work" not in first
    assert "@" not in first


def test_unknown_intent_cannot_generate_arbitrary_content():
    with pytest.raises(service.DraftUnavailable):
        asyncio.run(service.recommend_contact_message("write arbitrary code"))
