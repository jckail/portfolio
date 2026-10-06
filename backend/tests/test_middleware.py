"""Response-header middleware: security headers and cache policies."""
import os

import pytest

FRONTEND_DIST = os.path.join(
    os.path.dirname(__file__), "..", "..", "frontend", "dist"
)


def test_security_headers_present(client):
    response = client.get("/api/health")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert "Strict-Transport-Security" in response.headers
    assert "Permissions-Policy" in response.headers
    csp = response.headers["Content-Security-Policy"]
    assert "default-src 'self'" in csp
    assert "frame-ancestors 'none'" in csp
    assert "googletagmanager.com" in csp
    assert response.headers["Cross-Origin-Opener-Policy"] == "same-origin"


def _directive(csp: str, name: str) -> str:
    for part in csp.split(";"):
        part = part.strip()
        if part.startswith(name + " "):
            return part
    raise AssertionError(f"{name} missing from CSP: {csp!r}")


def test_script_src_disallows_inline_scripts(client):
    """The GA bootstrap is an external file, so inline script must stay
    blocked: 'unsafe-inline' would hand any injected <script> the admin token
    kept in localStorage."""
    csp = client.get("/api/health").headers["Content-Security-Policy"]
    script_src = _directive(csp, "script-src")
    assert "'unsafe-inline'" not in script_src
    assert "'unsafe-eval'" not in script_src
    assert "'self'" in script_src


def test_fonts_are_self_hosted_only(client):
    """index.html self-hosts its fonts under /fonts/, so the CSP no longer
    needs (or allows) the Google Fonts origins."""
    csp = client.get("/api/health").headers["Content-Security-Policy"]
    assert _directive(csp, "font-src").split()[1:] == ["'self'", "data:"]
    assert "fonts.googleapis.com" not in _directive(csp, "style-src")
    assert "fonts.gstatic.com" not in csp


def test_connect_src_has_no_wildcard_websockets(client):
    """Bare ws:/wss: would let injected script open a socket to any host."""
    csp = client.get("/api/health").headers["Content-Security-Policy"]
    sources = _directive(csp, "connect-src").split()[1:]
    assert "'self'" in sources
    assert "ws:" not in sources
    assert "wss:" not in sources
    assert "form-action 'self'" in csp


def test_websocket_origins_derive_from_https_origins():
    import dataclasses

    from backend.app.config import get_settings
    from backend.app.middleware.response_headers import websocket_origins

    settings = dataclasses.replace(
        get_settings(),
        allowed_origins=("https://jordan-kail.com", "http://localhost:5173"),
        production_url="https://www.jordan-kail.com/",
    )
    assert websocket_origins(settings) == " wss://jordan-kail.com wss://www.jordan-kail.com"


def test_resume_is_frameable_by_same_origin_only(client):
    """PDFViewer embeds /api/resume in a same-origin iframe; DENY/'none'
    rendered it as a broken frame."""
    response = client.get("/api/resume")
    assert response.headers["X-Frame-Options"] == "SAMEORIGIN"
    csp = response.headers["Content-Security-Policy"]
    assert _directive(csp, "frame-ancestors") == "frame-ancestors 'self'"
    assert "'unsafe-inline'" not in _directive(csp, "script-src")


def test_other_routes_stay_unframeable(client):
    for path in ("/api/health", "/api/resume/other", "/api/experience"):
        response = client.get(path)
        assert response.headers["X-Frame-Options"] == "DENY", path
        assert "frame-ancestors 'none'" in response.headers["Content-Security-Policy"]


@pytest.mark.parametrize(
    "incoming",
    ["short", "x" * 65, "x" * 3000, "abc def ghi", "abcdefgh/../etc", "id;drop<script>"],
)
def test_invalid_request_id_is_replaced(client, incoming):
    response = client.get("/api/health", headers={"X-Request-ID": incoming})
    rid = response.headers["X-Request-ID"]
    assert rid != incoming
    assert len(rid) == 32  # uuid4().hex


def test_valid_request_id_is_echoed(client):
    rid = "trace-1234.abc_DEF"
    response = client.get("/api/health", headers={"X-Request-ID": rid})
    assert response.headers["X-Request-ID"] == rid


def test_api_docs_hidden_outside_dev_mode(client):
    from backend.app.config import get_settings

    if get_settings().dev_mode:
        pytest.skip("DEV_MODE enabled in this environment")
    for path in ("/docs", "/redoc", "/openapi.json"):
        response = client.get(path)
        # Falls through to the static mount: never the schema or Swagger UI.
        assert '"openapi"' not in response.text, path
        assert "swagger" not in response.text.lower(), path


def test_cors_does_not_allow_credentials(client):
    response = client.options(
        "/api/experience",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "access-control-allow-credentials" not in response.headers
    assert "authorization" in response.headers["access-control-allow-headers"].lower()


@pytest.mark.skipif(
    not os.path.isdir(FRONTEND_DIST), reason="frontend not built"
)
def test_html_is_not_cached(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-cache"


@pytest.mark.skipif(
    not os.path.isfile(os.path.join(FRONTEND_DIST, "ga-init.js")),
    reason="frontend not built",
)
def test_retired_analytics_stub_revalidates(client):
    """Cached HTML can request the inert stub; it must revalidate after retirement."""
    response = client.get("/ga-init.js")
    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-cache"
    assert "document.createElement" not in response.text
    assert "googletagmanager" not in response.text


@pytest.mark.skipif(
    not os.path.isdir(os.path.join(FRONTEND_DIST, "assets")),
    reason="frontend not built",
)
def test_hashed_assets_are_immutable_and_gzipped(client):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    js_files = [f for f in os.listdir(assets_dir) if f.endswith(".js")]
    assert js_files, "expected at least one built JS asset"
    # Pick the largest chunk: GZipMiddleware only compresses responses over
    # its minimum_size threshold, and some vendor-split chunks are tiny.
    largest = max(js_files, key=lambda f: os.path.getsize(os.path.join(assets_dir, f)))
    response = client.get(
        f"/assets/{largest}", headers={"accept-encoding": "gzip"}
    )
    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "public, max-age=31536000, immutable"
    assert response.headers.get("Content-Encoding") == "gzip"


def test_public_content_routes_are_cacheable(client):
    """The five content calls that gate first render should be cacheable."""
    for path in ("/api/experience", "/api/skills", "/api/projects", "/api/aboutme"):
        cache = client.get(path).headers.get("Cache-Control", "")
        assert "max-age=60" in cache, f"{path} -> {cache!r}"
        assert "stale-while-revalidate" in cache


def test_health_is_never_cached(client):
    """A cached 'healthy' response would hide a real outage from the external
    uptime check, which alerts on /api/health/ready."""
    for path in ("/api/health", "/api/health/ready"):
        cache = client.get(path).headers.get("Cache-Control", "")
        assert cache == "no-store", f"{path} -> {cache!r}"


def test_authenticated_routes_are_not_publicly_cacheable(client):
    """Per-user responses must never carry a shared-cache directive."""
    for path in ("/api/admin/verify", "/api/admin/analytics", "/api/admin/logs", "/api/logs"):
        cache = client.get(path).headers.get("Cache-Control", "")
        assert "public" not in cache, f"{path} -> {cache!r}"


def test_error_responses_are_not_cached(client):
    """Caching a 404/401 would let a shared cache serve it to someone else."""
    for path in ("/api/experience/does-not-exist", "/api/skills/does-not-exist"):
        response = client.get(path)
        assert response.status_code != 200
        assert "public" not in response.headers.get("Cache-Control", "")


@pytest.mark.skipif(
    not os.path.isdir(os.path.join(FRONTEND_DIST, "fonts")), reason="frontend not built"
)
def test_already_compressed_media_skips_gzip(client):
    fonts = os.path.join(FRONTEND_DIST, "fonts")
    woff2 = next(f for f in os.listdir(fonts) if f.endswith(".woff2"))
    response = client.get(f"/fonts/{woff2}", headers={"accept-encoding": "gzip"})
    assert response.status_code == 200
    assert "content-encoding" not in response.headers
    assert response.headers["content-length"] == str(os.path.getsize(os.path.join(fonts, woff2)))


def test_zuni_sprites_skip_gzip(client):
    response = client.get("/api/zuni?subject=1", headers={"accept-encoding": "gzip"})
    assert response.status_code == 200
    assert "content-encoding" not in response.headers


def test_compressible_dynamic_responses_are_still_gzipped(client):
    response = client.get("/api/resume", headers={"accept-encoding": "gzip"})
    assert response.status_code == 200
    assert response.headers.get("content-encoding") == "gzip"


def test_cache_policy_table():
    from backend.app.middleware.response_headers import PUBLIC_CONTENT, cache_control_for

    assert cache_control_for("/api/skills", "GET", 304, "") == PUBLIC_CONTENT
    assert cache_control_for("/api/skills", "GET", 404, "application/json") is None
    assert cache_control_for("/api/skills", "POST", 200, "application/json") is None
    assert cache_control_for("/api/admin/verify", "GET", 200, "application/json") is None
    assert cache_control_for("/api/health/ready", "GET", 503, "application/json") == "no-store"
    assert cache_control_for("/images/a.webp", "GET", 200, "image/webp") == "public, max-age=86400"
    # versioned font files never change under the same name
    assert cache_control_for("/fonts/montserrat-v31-latin-wght-normal.woff2", "GET", 200, "font/woff2") == "public, max-age=31536000, immutable"
    assert cache_control_for("/fonts/OFL-Montserrat.txt", "GET", 200, "text/plain") is None


def test_websocket_scopes_pass_through_untouched(client):
    with client.websocket_connect("/ws/abcdefgh-1234", headers={"origin": "http://localhost:5173"}) as ws:
        ws.send_json({"type": "context", "content": "x"})
