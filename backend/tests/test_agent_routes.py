"""Actual public HTTP protocol requests, privacy and work-budget boundaries."""
import json

import pytest

from backend.app.api.agent_routes import limiter
from backend.app.services.public_context import public_context


@pytest.fixture(autouse=True)
def reset_agent_limits():
    limiter.reset()
    yield
    limiter.reset()


def rpc(client, method, params=None, id=1, **kwargs):
    return client.post("/mcp", json={"jsonrpc": "2.0", "id": id, "method": method, "params": params or {}},
                       headers={"Accept": "application/json, text/event-stream"}, **kwargs)


def test_context_has_current_public_facts_and_no_private_fields(client):
    response = client.get("/context.json")
    assert response.status_code == 200
    data = response.json()
    assert data["profile"]["location"] == "San Francisco, CA"
    assert data["education"][0]["study"] == "Computer Science"
    assert "AI & Agent Engineering" in [g["name"] for g in data["skillGroups"]]
    assert "phone" not in response.text.lower()
    assert "email" not in data["profile"]
    assert client.get("/context.json", headers={"If-None-Match": response.headers["etag"]}).status_code == 304
    assert client.head("/context.json").content == b""


def test_graphql_field_selection_and_introspection(client):
    response = client.post("/graphql", json={"query": "{ profile { name location } education { institution study } skillGroups { name } }"})
    assert response.status_code == 200
    assert response.json()["data"]["profile"] == {"name": "Jordan Kail", "location": "San Francisco, CA"}
    result = client.get("/graphql", params={"query": "{ __schema { mutationType { name } queryType { name } } }"}).json()
    assert result["data"]["__schema"] == {"mutationType": None, "queryType": {"name": "Query"}}


@pytest.mark.parametrize("query", [
    "mutation { profile { name } }", "subscription { profile { name } }",
    "{ profile { phone } }", "{ admin { token } }", "{ contact { email } }",
    "{ " + " ".join(f"p{i}: profile {{ name }}" for i in range(110)) + " }",
    "{ ...A } fragment A on Query { ...A }",
    "{ __schema { types { fields { type { ofType { ofType { ofType { ofType { ofType { name } } } } } } } } } }",
    "{ " + " ".join("...A" for _ in range(110)) + " } fragment A on Query { profile { name } }",
])
def test_graphql_rejects_writes_private_fields_and_expensive_queries(client, query):
    response = client.post("/graphql", json={"query": query})
    assert response.status_code == 400 and "errors" in response.json()


@pytest.mark.parametrize("payload", [[{"query": "{ profile { name } }"}], {"query": None},
                                     {"query": "x" * 8193}, {"query": "{ profile { name } }", "variables": []}])
def test_graphql_rejects_invalid_payloads(client, payload):
    assert client.post("/graphql", json=payload).status_code == 400


def test_agent_body_and_rate_limits(client):
    assert client.post("/graphql", content="x" * 17000, headers={"Content-Type": "application/json"}).status_code == 413
    assert client.post("/mcp", content="x" * 17000).status_code == 413
    for _ in range(58):
        assert client.get("/graphql", params={"query": "{ profile { name } }"}).status_code == 200
    assert client.get("/graphql", params={"query": "{ profile { name } }"}).status_code == 429


def test_graphql_bad_media_variables_operations_and_get_limit(client):
    assert client.post("/graphql", content="{}").status_code == 415
    assert client.get("/graphql", params={"query": "{ profile { name } }", "variables": "x" * 17000}).status_code == 413
    assert client.get("/graphql", params={"query": "{ profile { name } }", "variables": "not JSON"}).status_code == 400
    assert client.post("/graphql", json={"query": "{ profile { name } }", "operationName": []}).status_code == 400
    assert client.post("/graphql", json={"query": "query A { profile { name } } query B { profile { name } }"}).status_code == 400
    assert client.post("/graphql", json={"query": "{ ...Missing }"}).status_code == 400


def test_mcp_request_rate_limit_and_http_methods(client):
    limiter.record("unused", cost=600)
    assert client.post("/mcp", json={}).status_code == 429
    limiter.reset()
    client.base_url = "http://localhost"
    # Stateless JSON transport has no server-initiated stream/session to delete.
    assert client.get("/mcp", headers={"Accept": "text/event-stream"}).status_code == 405
    assert client.delete("/mcp").status_code == 405
    assert client.post("/mcp", json={"invalid": "rpc"}, headers={"Accept": "application/json, text/event-stream"}).status_code == 400
    invalid = rpc(client, "tools/call", {"name": "search_portfolio", "arguments": {"query": " ", "limit": 11}}).json()["result"]
    assert invalid["isError"]
    empty = rpc(client, "tools/call", {"name": "search_portfolio", "arguments": {"query": "zzzznonexistent"}}).json()["result"]
    assert empty["structuredContent"]["matches"] == []
    client.base_url = "http://testserver"


def test_mcp_protocol_initialization_tools_resources_and_privacy(client):
    # SDK uses localhost allowlist even though the shared fixture uses testserver.
    client.base_url = "http://localhost"
    initialized = rpc(client, "initialize", {"protocolVersion": "2025-11-25", "capabilities": {}, "clientInfo": {"name": "test", "version": "1"}})
    assert initialized.status_code == 200
    assert "mcp-session-id" not in initialized.headers
    assert initialized.json()["result"]["serverInfo"]["name"] == "Jordan Kail Portfolio"
    tools = rpc(client, "tools/list").json()["result"]["tools"]
    assert {tool["name"] for tool in tools} == {"get_portfolio_context", "search_portfolio"}
    assert all(tool["annotations"]["readOnlyHint"] for tool in tools)
    context = rpc(client, "tools/call", {"name": "get_portfolio_context", "arguments": {"section": "education"}}).json()["result"]
    assert not context.get("isError")
    assert "Computer Science" in json.dumps(context)
    assert rpc(client, "tools/call", {"name": "search_portfolio", "arguments": {"query": "agent", "limit": 1}}).json()["result"]["structuredContent"]["matches"]
    invalid = rpc(client, "tools/call", {"name": "get_portfolio_context", "arguments": {"section": "admin"}}).json()["result"]
    assert invalid["isError"]
    resources = rpc(client, "resources/list").json()["result"]["resources"]
    assert resources[0]["uri"] == "portfolio://jordan-kail/context"
    resource = rpc(client, "resources/read", {"uri": resources[0]["uri"]}).json()["result"]
    assert json.loads(resource["contents"][0]["text"]) == public_context()
    denied = client.post("/mcp", json={"jsonrpc": "2.0", "id": 1, "method": "tools/list"},
                         headers={"Origin": "https://evil.example", "Accept": "application/json, text/event-stream"})
    assert denied.status_code == 403
    for domain in ("jordankail.ai", "www.jordankail.ai"):
        allowed = client.post("/mcp", json={"jsonrpc": "2.0", "id": 1, "method": "tools/list"},
                              headers={"Host": domain, "Origin": f"https://{domain}",
                                       "Accept": "application/json, text/event-stream"})
        assert allowed.status_code == 200
    assert client.post("/mcp", json={"jsonrpc": "2.0", "id": 1, "method": "tools/list"},
                       headers={"Host": "evil.example", "Accept": "application/json, text/event-stream"}).status_code == 421
    client.base_url = "http://testserver"
