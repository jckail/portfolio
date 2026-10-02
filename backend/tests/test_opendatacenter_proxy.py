"""The portfolio only exposes the atlas' public subpath and strips credentials."""

from dataclasses import replace

import httpx
import pytest

from backend.app import opendatacenter_proxy
from backend.app.config import get_settings
from backend.app.main import app


@pytest.fixture
def gateway(client, monkeypatch):
    seen = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        if request.url.path.endswith("/assets/app-123.js"):
            return httpx.Response(200, content=b"console.log('atlas')", headers={"content-type": "text/javascript"})
        return httpx.Response(200, json={"public": True}, headers={"content-type": "application/json"})

    transport = httpx.MockTransport(handler)
    original = httpx.AsyncClient
    monkeypatch.setattr(
        opendatacenter_proxy,
        "_client_factory",
        lambda **kwargs: original(transport=transport, **kwargs),
    )
    app.dependency_overrides[get_settings] = lambda: replace(
        get_settings(),
        opendatacenter_upstream_url="https://atlas-example.a.run.app",
    )
    try:
        yield client, seen
    finally:
        app.dependency_overrides.pop(get_settings, None)


@pytest.mark.parametrize("path", ["/opendatacenter/", "/opendatacenter/v1/organizations", "/opendatacenter/v1/entities/entity-1"])
def test_unconfigured_gateway_is_not_public(client, path):
    assert client.get(path, headers={"accept": "text/html"}).status_code == 404


def test_public_reads_preserve_subpath_query_and_drop_credentials(gateway):
    client, seen = gateway
    response = client.get(
        "/opendatacenter/v1/facilities?country=US&limit=2",
        headers={"authorization": "Bearer never-forward", "cookie": "private=value", "origin": "https://jckail.com"},
    )
    assert response.json() == {"public": True}
    assert str(seen[-1].url) == "https://atlas-example.a.run.app/opendatacenter/v1/facilities?country=US&limit=2"
    assert "authorization" not in seen[-1].headers
    assert "cookie" not in seen[-1].headers
    assert seen[-1].headers["origin"] == "https://jckail.com"
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize("method", ["GET", "HEAD"])
@pytest.mark.parametrize("path", ["organizations?q=Acme&limit=20&cursor=opaque", "entities/entity-1"])
def test_organization_and_entity_reads_preserve_route_and_strip_credentials(gateway, method, path):
    client, seen = gateway
    response = client.request(
        method,
        f"/opendatacenter/v1/{path}",
        headers={"authorization": "Bearer never-forward", "cookie": "private=value"},
    )
    assert response.status_code == 200
    assert str(seen[-1].url) == f"https://atlas-example.a.run.app/opendatacenter/v1/{path}"
    assert seen[-1].method == method
    assert "authorization" not in seen[-1].headers
    assert "cookie" not in seen[-1].headers
    assert response.headers["cache-control"] == "no-store"
    assert response.content == (b"" if method == "HEAD" else b'{"public":true}')


@pytest.mark.parametrize("method", ["POST", "PUT", "PATCH", "DELETE"])
@pytest.mark.parametrize("path", ["organizations", "entities/entity-1"])
def test_organization_and_entity_writes_never_reach_upstream(gateway, method, path):
    client, seen = gateway
    assert client.request(method, f"/opendatacenter/v1/{path}", json={"name": "forged"}).status_code == 404
    assert not seen


def test_static_asset_and_map_csp(gateway):
    client, _ = gateway
    response = client.get("/opendatacenter/assets/app-123.js")
    assert response.text == "console.log('atlas')"
    assert response.headers["cache-control"] == "public, max-age=31536000, immutable"
    assert "https://demotiles.maplibre.org" in response.headers["content-security-policy"]
    assert "https://demotiles.maplibre.org" not in client.get("/api/health").headers["content-security-policy"]


@pytest.mark.parametrize("failure", ["missing", "unavailable"])
def test_failed_asset_is_not_cached(gateway, monkeypatch, failure):
    client, _ = gateway
    original = httpx.AsyncClient

    def handler(request: httpx.Request) -> httpx.Response:
        if failure == "unavailable":
            raise httpx.ConnectError("upstream unavailable")
        return httpx.Response(404, headers={"cache-control": "public, max-age=31536000"})

    monkeypatch.setattr(
        opendatacenter_proxy,
        "_client_factory",
        lambda **kwargs: original(transport=httpx.MockTransport(handler), **kwargs),
    )
    response = client.get("/opendatacenter/assets/missing-chunk.js")
    assert response.status_code == (404 if failure == "missing" else 502)
    assert response.headers["cache-control"] == "no-store"


def test_streamed_asset_respects_downstream_identity_encoding(gateway, monkeypatch):
    client, _ = gateway
    seen = []
    original = httpx.AsyncClient

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(
            200,
            stream=httpx.ByteStream(b"plain streamed asset"),
            headers={"content-type": "text/javascript"},
        )

    monkeypatch.setattr(
        opendatacenter_proxy,
        "_client_factory",
        lambda **kwargs: original(transport=httpx.MockTransport(handler), **kwargs),
    )
    response = client.get(
        "/opendatacenter/assets/app-123.js", headers={"accept-encoding": "identity"}
    )
    assert response.content == b"plain streamed asset"
    assert seen[-1].headers["accept-encoding"] == "identity"
    assert "content-encoding" not in response.headers


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("GET", "/opendatacenter/v1/admin/ingestions"),
        ("GET", "/opendatacenter/v1/admin/entities"),
        ("HEAD", "/opendatacenter/v1/admin/entities"),
        ("POST", "/opendatacenter/v1/admin/entities"),
        ("POST", "/opendatacenter/v1/admin/derivations"),
        ("GET", "/opendatacenter/v1/organizations-admin"),
        ("GET", "/opendatacenter/v1/entities-admin"),
        ("POST", "/opendatacenter/v1/facilities"),
        ("GET", "/opendatacenter/v1/unknown"),
        ("GET", "/opendatacenter/unknown.js"),
        ("PUT", "/opendatacenter/mcp/"),
    ],
)
def test_nonpublic_paths_and_methods_are_blocked(gateway, method, path):
    client, seen = gateway
    assert client.request(method, path).status_code == 404
    assert not seen


def test_mcp_post_is_bounded_and_same_origin(gateway):
    client, seen = gateway
    response = client.post(
        "/opendatacenter/mcp/",
        content=b'{"jsonrpc":"2.0"}',
        headers={"content-type": "application/json", "mcp-protocol-version": "2025-03-26"},
    )
    assert response.status_code == 200
    assert seen[-1].url.path == "/opendatacenter/mcp/"
    assert seen[-1].headers["mcp-protocol-version"] == "2025-03-26"
    assert response.headers["cache-control"] == "no-store"
    count = len(seen)
    assert client.post("/opendatacenter/mcp/", content=b"x" * (1024 * 1024 + 1)).status_code == 413
    assert len(seen) == count


def test_slashless_mcp_post_targets_canonical_upstream_without_redirect(gateway):
    client, seen = gateway
    response = client.post(
        "/opendatacenter/mcp",
        content=b'{"jsonrpc":"2.0"}',
        headers={"content-type": "application/json"},
    )
    assert response.status_code == 200
    assert seen[-1].url.path == "/opendatacenter/mcp/"


@pytest.mark.parametrize(
    "origin",
    ["http://atlas.a.run.app", "https://evil.example", "https://atlas.a.run.app/path", "https://atlas.a.run.app@evil.example"],
)
def test_upstream_configuration_is_fixed_cloud_run_origin(origin):
    with pytest.raises(ValueError):
        opendatacenter_proxy.upstream_origin(origin)
