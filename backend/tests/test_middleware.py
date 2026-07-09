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


@pytest.mark.skipif(
    not os.path.isdir(FRONTEND_DIST), reason="frontend not built"
)
def test_html_is_not_cached(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-cache"


@pytest.mark.skipif(
    not os.path.isdir(os.path.join(FRONTEND_DIST, "assets")),
    reason="frontend not built",
)
def test_hashed_assets_are_immutable_and_gzipped(client):
    js_files = [
        f
        for f in os.listdir(os.path.join(FRONTEND_DIST, "assets"))
        if f.endswith(".js")
    ]
    assert js_files, "expected at least one built JS asset"
    response = client.get(
        f"/assets/{js_files[0]}", headers={"accept-encoding": "gzip"}
    )
    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "public, max-age=31536000, immutable"
    assert response.headers.get("Content-Encoding") == "gzip"
