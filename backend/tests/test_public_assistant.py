"""Offline contracts: no real models, database, mail, auth grants or execution."""
import asyncio
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.app.api import assistant_evidence_routes as onsite
from backend.app.api import public_mcp_routes as mcp
from backend.app.services import public_evidence
from backend.app.services.agent_budget import SpendingDenied
from backend.app.services.agents_sdk_adapter import draft_grounded_answer
from backend.app.utils.rate_limit import SlidingWindowLimiter


@pytest.fixture
def anyio_backend():
    return "asyncio"


HEADERS = {"accept": "application/json, text/event-stream"}


@pytest.fixture
def isolated_client(monkeypatch):
    app = FastAPI()
    app.include_router(onsite.router, prefix="/api")
    app.include_router(mcp.router, prefix="/api")
    monkeypatch.setattr(onsite, "limiter", SlidingWindowLimiter(10, 60, global_max_events=100))
    monkeypatch.setattr(mcp, "limiter", SlidingWindowLimiter(30, 60, global_max_events=300))
    with TestClient(app) as client:
        yield client


def rpc(client, method, params=None, rpc_id=1, **kwargs):
    return client.post("/api/mcp", json={"jsonrpc": "2.0", "id": rpc_id, "method": method,
                                      "params": params or {}}, headers=HEADERS, **kwargs)


def test_shared_real_public_sources(isolated_client):
    onsite_result = isolated_client.post("/api/assistant/evidence", json={"query": "Python"}).json()
    external = rpc(isolated_client, "tools/call", {"name": "search_public_evidence",
                                                  "arguments": {"query": "Python"}}).json()
    assert external["result"]["structuredContent"] == onsite_result
    assert onsite_result["sources"]
    for source in onsite_result["sources"]:
        assert source["url"].startswith("https://www.jckail.com/")
        assert source["snippets"]


def test_missing_evidence_does_not_invent(isolated_client):
    answer = isolated_client.post("/api/assistant/evidence", json={"query": "UnicornAchievementXYZ123"}).json()
    assert not answer["sources"]
    assert "couldn't find supporting public evidence" in answer["answer"]


def test_protocol_lifecycle(isolated_client):
    result = rpc(isolated_client, "initialize", {"protocolVersion": "2025-06-18"}).json()["result"]
    assert result["protocolVersion"] == "2025-06-18"
    assert result["capabilities"] == {"tools": {}}
    assert isolated_client.post("/api/mcp", json={"jsonrpc": "2.0", "method": "notifications/initialized"},
                                headers=HEADERS).status_code == 202
    tools = rpc(isolated_client, "tools/list").json()["result"]["tools"]
    assert len(tools) == 1 and tools[0]["annotations"]["readOnlyHint"]
    assert rpc(isolated_client, "ping").json()["result"] == {}
    assert isolated_client.get("/api/mcp").status_code == 405


@pytest.mark.parametrize("arguments", [
    {"query": "Python", "path": "/etc/passwd"}, {"query": "a" * 201},
    {"query": ""}, {"query": ["Python"]}, {"query": True}, {},
])
def test_bounded_arguments(isolated_client, arguments):
    result = rpc(isolated_client, "tools/call", {"name": "search_public_evidence", "arguments": arguments})
    assert result.json()["error"]["code"] == -32602


@pytest.mark.parametrize("name", ["execute_code", "contact_jordan", "request_phone", "__proto__"])
def test_no_execute_or_private_tools(isolated_client, name):
    assert rpc(isolated_client, "tools/call", {"name": name}).json()["error"]["code"] == -32602


def test_origin_accept_size_and_json(isolated_client):
    response = isolated_client.post("/api/mcp", json={}, headers={**HEADERS, "origin": "https://evil.example"})
    assert response.status_code == 403
    assert isolated_client.post("/api/mcp", json={}, headers={"accept": "application/json"}).status_code == 406
    assert isolated_client.post("/api/mcp", content="x" * 8193,
                                headers={**HEADERS, "content-type": "application/json"}).status_code == 413
    assert isolated_client.post("/api/mcp", content="{",
                                headers={**HEADERS, "content-type": "application/json"}).status_code == 400
    assert isolated_client.post("/api/mcp", json=[], headers=HEADERS).status_code == 400
    assert isolated_client.post("/api/mcp", json={},
                                headers={**HEADERS, "mcp-protocol-version": "unsupported"}).status_code == 400


def test_rate_limit_repeated_requests(isolated_client):
    for _ in range(10):
        assert isolated_client.post("/api/assistant/evidence", json={"query": "Python"}).status_code == 200
    assert isolated_client.post("/api/assistant/evidence", json={"query": "Python"}).status_code == 429
    for _ in range(30):
        assert rpc(isolated_client, "ping").status_code == 200
    assert rpc(isolated_client, "ping").status_code == 429


def test_public_source_isolation(monkeypatch):
    from backend.app.services import chat_tools
    monkeypatch.setattr(chat_tools, "_collections", lambda: {
        "projects": {"safe": {"title": "Python public demo", "description": "Python evidence",
                             "phone": "Python-private-phone", "email": "Python-private-email",
                             "link": "https://private.example/Python"}},
        "contact": {"secret": {"description": "Python-secret"}},
    })
    result = public_evidence.evidence_answer("Python").model_dump()
    text = json.dumps(result)
    assert "Python evidence" in text
    assert "private" not in text and "secret" not in text
    assert len(result["sources"]) == 1


def test_capabilities_do_not_unlock_on_auth_header(isolated_client):
    response = isolated_client.get("/api/assistant/capabilities", headers={"authorization": "Bearer not-a-grant"})
    assert response.json()["paid_agents"] is False
    assert response.json()["richer_demos"] == "not_enabled"


@pytest.mark.anyio
async def test_sdk_fail_closed_before_import_or_call():
    sdk = SimpleNamespace(Runner=SimpleNamespace(run=AsyncMock()))
    for kwargs in [{}, {"approved": True}, {"approved": True, "subject": "verified"}]:
        with pytest.raises(SpendingDenied):
            await draft_grounded_answer("Python", sdk=sdk, client=SimpleNamespace(max_retries=0), **kwargs)
    sdk.Runner.run.assert_not_called()


@pytest.mark.anyio
async def test_sdk_quota_denied_storage_failure_and_denied_auth():
    sdk = SimpleNamespace(Runner=SimpleNamespace(run=AsyncMock()))
    for reservation in [AsyncMock(return_value=False), AsyncMock(side_effect=RuntimeError("storage offline"))]:
        ledger = SimpleNamespace(reserve=reservation)
        with pytest.raises(SpendingDenied):
            await draft_grounded_answer("Python", sdk=sdk, approved=True, subject="verified", ledger=ledger, client=SimpleNamespace(max_retries=0))
    sdk.Runner.run.assert_not_called()


@pytest.mark.anyio
async def test_sdk_mock_bounded_and_cancellation_not_refunded():
    run = AsyncMock(return_value=SimpleNamespace(final_output="Mock answer"))
    sdk = SimpleNamespace(Agent=lambda **kw: kw, ModelSettings=lambda **kw: kw,
                          RunConfig=lambda **kw: kw, OpenAIResponsesModel=lambda **kw: kw, Runner=SimpleNamespace(run=run))
    reservation = AsyncMock(return_value=True)
    ledger = SimpleNamespace(reserve=reservation)
    result = await draft_grounded_answer("Python", approved=True, subject="verified", ledger=ledger, sdk=sdk, client=SimpleNamespace(max_retries=0))
    assert result["mode"] == "sdk_draft" and result["sources"]
    assert run.call_args.kwargs["max_turns"] == 1
    assert run.call_args.kwargs["run_config"]["tracing_disabled"]
    assert run.call_args.args[0]["tools"] == []
    assert run.call_args.args[0]["model_settings"]["max_tokens"] == 512
    assert reservation.call_args.args[1] <= 14560
    run.side_effect = asyncio.CancelledError()
    with pytest.raises(asyncio.CancelledError):
        await draft_grounded_answer("Python", approved=True, subject="verified", ledger=ledger, sdk=sdk, client=SimpleNamespace(max_retries=0))
    # Both potentially billable dispatches remain reserved, including interruption.
    assert reservation.await_count == 2


def test_whitespace_and_malformed_origin_fail_safely(isolated_client):
    assert isolated_client.post("/api/assistant/evidence", json={"query": "   "}).status_code == 422
    for origin in ("https://[", "ftp://testserver", "http://user@testserver", "http://testserver/path"):
        assert isolated_client.post("/api/mcp", json={}, headers={**HEADERS, "origin": origin}).status_code == 403
    deep = "[" * 1200 + "0" + "]" * 1200
    assert isolated_client.post("/api/mcp", content=deep, headers={**HEADERS, "content-type": "application/json"}).status_code == 400


@pytest.mark.anyio
async def test_sdk_retries_are_rejected_before_reservation():
    ledger = SimpleNamespace(reserve=AsyncMock(return_value=True))
    with pytest.raises(SpendingDenied):
        await draft_grounded_answer("Python", approved=True, subject="verified", ledger=ledger,
                                    client=SimpleNamespace(max_retries=2))
    ledger.reserve.assert_not_called()


def test_production_router_mounts_shared_evidence_and_mcp(client, monkeypatch):
    monkeypatch.setattr(onsite, "limiter", SlidingWindowLimiter(10, 60, global_max_events=100))
    monkeypatch.setattr(mcp, "limiter", SlidingWindowLimiter(30, 60, global_max_events=300))
    answer = client.post("/api/assistant/evidence", json={"query": "Python"})
    assert answer.status_code == 200 and answer.json()["sources"]
    external = rpc(client, "tools/call", {"name": "search_public_evidence", "arguments": {"query": "Python"}})
    assert external.status_code == 200
    assert external.json()["result"]["structuredContent"] == answer.json()
    assert client.get("/api/assistant/capabilities").json()["paid_agents"] is False
