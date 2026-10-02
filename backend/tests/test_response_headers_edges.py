"""Cache policy and header edge cases for ResponseHeadersMiddleware."""
import asyncio

from backend.app.config import get_settings
from backend.app.middleware.response_headers import IMMUTABLE, ResponseHeadersMiddleware, cache_control_for


def test_cache_policy_edges():
    # Logs are admin-only and per-user, like /api/admin
    assert cache_control_for("/api/logs", "GET", 200, "application/json") is None
    # HTML always revalidates, even for error statuses served by the SPA fallback
    assert cache_control_for("/nope", "GET", 404, "text/html; charset=utf-8") == "no-cache"
    assert cache_control_for("/ga-init.js", "GET", 200, "text/javascript") == "no-cache"
    assert cache_control_for("/assets/index-abc123.js", "GET", 200, "text/javascript") == IMMUTABLE
    # A non-API path with JSON gets no implicit policy
    assert cache_control_for("/other", "GET", 200, "application/json") is None


def _run(app, scope):
    sent = []

    async def send(message):
        sent.append(message)

    async def receive():
        return {"type": "http.request"}

    asyncio.run(ResponseHeadersMiddleware(app, get_settings())(scope, receive, send))
    return sent


def test_handler_cache_control_is_not_overridden():
    async def app(scope, receive, send):
        await send({
            "type": "http.response.start", "status": 200,
            "headers": [(b"cache-control", b"private, max-age=5"), (b"content-type", b"application/json")],
        })
        await send({"type": "http.response.body", "body": b"{}"})

    scope = {"type": "http", "path": "/api/skills", "method": "GET", "headers": []}
    headers = {k.decode(): v.decode() for k, v in _run(app, scope)[0]["headers"]}
    assert headers["cache-control"] == "private, max-age=5"
    assert headers["x-frame-options"] == "DENY"
    assert "frame-ancestors 'none'" in headers["content-security-policy"]


def test_request_id_header_and_state_are_set_on_the_response():
    seen = {}

    async def app(scope, receive, send):
        seen["state_id"] = scope["state"]["request_id"]
        await send({"type": "http.response.start", "status": 204, "headers": []})

    scope = {"type": "http", "path": "/x", "method": "GET", "headers": [(b"x-request-id", b"abcdefgh12345")]}
    headers = {k.decode(): v.decode() for k, v in _run(app, scope)[0]["headers"]}
    assert headers["x-request-id"] == "abcdefgh12345" == seen["state_id"]
