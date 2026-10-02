"""Capability, isolation, private caching and bounded tool HTTP contracts."""

from dataclasses import replace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.app.api import dataplayground_runtime_routes as routes
from backend.app.config import get_settings
from backend.app.models.dataplayground_runtime import QueryResult, RuntimeState, SessionResponse
from backend.app.services import dataplayground_copilot as copilot
from backend.app.services.dataplayground_runtime import RuntimeManager

ROOT = "/api/dataplayground"


@pytest.fixture()
def runtime_client(monkeypatch):
    now = [100.0]
    runtime = RuntimeManager(background=False, clock=lambda: now[0], ttl=60)
    monkeypatch.setattr(routes, "get_runtime", lambda: runtime)
    monkeypatch.setattr(copilot, "get_runtime", lambda: runtime)
    monkeypatch.setattr(copilot, "get_settings", lambda: replace(get_settings(), dataplayground_copilot_daily_tokens=0))

    def prohibit_provider(*args, **kwargs):
        raise AssertionError("Runtime route tests must not call any real model provider")

    monkeypatch.setattr(copilot, "build_provider", prohibit_provider)
    copilot._pending.clear()
    for limiter in (routes._sessions, routes._operations, routes._chat):
        limiter.reset()
    app = FastAPI()
    app.include_router(routes.router, prefix="/api")
    with TestClient(app) as client:
        yield client, runtime, now
    runtime.close()
    copilot._pending.clear()
    for limiter in (routes._sessions, routes._operations, routes._chat):
        limiter.reset()


def create(client):
    response = client.post(ROOT + "/runtime/session", json={})
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    body = SessionResponse.model_validate(response.json())
    return {"Authorization": "Bearer " + body.token}, body


def test_session_state_query_and_actions_are_real_and_private(runtime_client):
    client, _, _ = runtime_client
    headers, session = create(client)
    other_headers, _ = create(client)
    state_response = client.get(ROOT + "/runtime/state", headers=headers)
    state = RuntimeState.model_validate(state_response.json())
    assert state.scenario_id == "baseline" and not state.streaming.producer_running
    sql = "SELECT COUNT(*) n FROM products"
    result_response = client.post(ROOT + "/runtime/query", headers=headers, json={"sql": sql})
    assert QueryResult.model_validate(result_response.json()).rows == [[48]]
    action_response = client.post(
        ROOT + "/runtime/action", headers=headers, json={"action": "produce", "batch_size": 12}
    )
    assert action_response.json()["streaming"]["produced"] == 12
    assert client.get(ROOT + "/runtime/state", headers=other_headers).json()["streaming"]["produced"] == 0
    assert session.token not in action_response.text
    for response in (state_response, result_response, action_response):
        assert response.status_code == 200 and response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize("authorization", [None, "", "Basic ignored", "Bearer short", "Bearer " + "a" * 101])
def test_missing_malformed_capabilities_are_401_and_uncached(runtime_client, authorization):
    client, _, _ = runtime_client
    headers = {} if authorization is None else {"Authorization": authorization}
    response = client.get(ROOT + "/runtime/state", headers=headers)
    assert response.status_code == 401 and response.headers["cache-control"] == "no-store"


def test_unknown_expired_and_closed_capability_is_410(runtime_client):
    client, _, now = runtime_client
    unknown = client.get(ROOT + "/runtime/state", headers={"Authorization": "Bearer " + "x" * 43})
    assert unknown.status_code == 410 and unknown.headers["cache-control"] == "no-store"
    headers, _ = create(client)
    now[0] += 61
    expired = client.post(ROOT + "/runtime/query", headers=headers, json={"sql": "SELECT 1"})
    assert expired.status_code == 410 and expired.headers["cache-control"] == "no-store"
    headers, _ = create(client)
    closed = client.post(ROOT + "/runtime/close", headers=headers)
    assert closed.status_code == 200 and closed.json() == {"closed": True}
    assert closed.headers["cache-control"] == "no-store"
    assert client.get(ROOT + "/runtime/state", headers=headers).status_code == 410


@pytest.mark.parametrize(
    "suffix,body",
    [
        ("/runtime/session", {"scenario_id": "unknown"}),
        ("/runtime/action", {"action": "produce", "batch_size": True}),
        ("/runtime/action", {"action": "produce", "invalid_rate": 0.9}),
        ("/runtime/query", {"sql": "DELETE FROM products"}),
        ("/runtime/query", {"sql": "SELECT 1", "row_limit": 501}),
        ("/runtime/query", {"sql": "SELECT 1", "unexpected": True}),
    ],
)
def test_invalid_contracts_and_readonly_sql_rejections(runtime_client, suffix, body):
    client, _, _ = runtime_client
    headers, _ = create(client)
    response = client.post(ROOT + suffix, headers=headers, json=body)
    assert response.status_code == 422 and response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize(
    "suffix", ["/runtime/session", "/runtime/action", "/runtime/query", "/copilot/chat", "/copilot/confirm"]
)
def test_content_type_and_streamed_body_limits(runtime_client, suffix):
    client, _, _ = runtime_client
    headers, _ = create(client)
    unsupported = client.post(ROOT + suffix, headers=headers, content="{}")
    assert unsupported.status_code == 415 and unsupported.headers["cache-control"] == "no-store"
    oversized = client.post(
        ROOT + suffix,
        headers={**headers, "Content-Type": "application/json"},
        content=iter([b" " * 30000, b" " * 30000]),
    )
    assert oversized.status_code == 413 and oversized.headers["cache-control"] == "no-store"


def test_session_operation_and_chat_rate_limits(runtime_client):
    client, _, _ = runtime_client
    headers, _ = create(client)
    for _ in range(5):
        assert client.post(ROOT + "/runtime/session", json={}).status_code == 200
    session_limit = client.post(ROOT + "/runtime/session", json={})
    assert session_limit.status_code == 429
    for _ in range(90):
        assert client.get(ROOT + "/runtime/state", headers=headers).status_code == 200
    operation_limit = client.get(ROOT + "/runtime/state", headers=headers)
    assert operation_limit.status_code == 429
    for _ in range(4):
        assert (
            client.post(
                ROOT + "/copilot/chat", headers=headers, json={"message": "Inspect current workspace"}
            ).status_code
            == 503
        )
    chat_limit = client.post(ROOT + "/copilot/chat", headers=headers, json={"message": "Inspect current workspace"})
    assert chat_limit.status_code == 429
    for response in (session_limit, operation_limit, chat_limit):
        assert response.headers["cache-control"] == "no-store"


def test_copilot_disabled_status_unavailable_and_mock_service(runtime_client, monkeypatch):
    client, _, _ = runtime_client
    status = client.get(ROOT + "/copilot/status")
    assert status.status_code == 200 and status.headers["cache-control"] == "no-store"
    assert status.json()["available"] is False and status.json()["engine"] == "Pi Agent SDK"
    headers, _ = create(client)
    unavailable = client.post(ROOT + "/copilot/chat", headers=headers, json={"message": "Inspect current workspace"})
    assert unavailable.status_code == 503 and unavailable.headers["cache-control"] == "no-store"
    mock_chat = AsyncMock(side_effect=copilot.CopilotUnavailable)
    monkeypatch.setattr(copilot, "chat", mock_chat)
    response = client.post(ROOT + "/copilot/chat", headers=headers, json={"message": "Inspect current workspace"})
    assert response.status_code == 503 and mock_chat.await_count == 1


def test_copilot_expired_capability_and_confirmation_ownership(runtime_client):
    client, runtime, now = runtime_client
    headers, first = create(client)
    other_headers, _ = create(client)
    proposal = copilot._tool(
        first.token, "propose_runtime_change", {"action": "produce", "reason": "Append synthetic records"}
    )["proposal"]
    wrong_owner = client.post(ROOT + "/copilot/confirm", headers=other_headers, json={"id": proposal["id"]})
    assert wrong_owner.status_code == 422 and wrong_owner.headers["cache-control"] == "no-store"
    assert runtime.state(first.token).streaming.produced == 0
    confirmed = client.post(ROOT + "/copilot/confirm", headers=headers, json={"id": proposal["id"]})
    assert confirmed.status_code == 200 and confirmed.json()["streaming"]["produced"] == 10
    assert confirmed.headers["cache-control"] == "no-store"
    assert client.post(ROOT + "/copilot/confirm", headers=headers, json={"id": proposal["id"]}).status_code == 422
    now[0] += 61
    expired = client.post(ROOT + "/copilot/chat", headers=headers, json={"message": "Inspect workspace"})
    assert expired.status_code == 410 and expired.headers["cache-control"] == "no-store"


def test_runtime_capacity_errors_are_private(runtime_client):
    client, runtime, _ = runtime_client
    runtime.capacity = 1
    create(client)
    response = client.post(ROOT + "/runtime/session", json={})
    assert response.status_code in {422, 429}
    assert response.headers["cache-control"] == "no-store" and "capacity" in response.json()["detail"].lower()
