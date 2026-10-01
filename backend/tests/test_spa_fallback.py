"""History-API fallback: client routes get index.html, everything else 404s."""
import os

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.app.spa import SPAStaticFiles

HTML = {"accept": "text/html,application/xhtml+xml,*/*;q=0.8"}
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")


@pytest.fixture()
def spa(tmp_path):
    (tmp_path / "index.html").write_text("<!doctype html><title>spa</title>")
    (tmp_path / "robots.txt").write_text("User-agent: *")
    (tmp_path / "assets").mkdir()
    (tmp_path / "assets" / "app-abc123.js").write_text("console.log(1)")
    app = FastAPI()

    @app.get("/api/ping")
    async def ping():
        return {"ok": True}

    app.mount("/", SPAStaticFiles(directory=str(tmp_path), html=True), name="frontend")
    return TestClient(app)


@pytest.mark.parametrize("path", ["/", "/admin"])
def test_known_client_route_serves_index_with_200(spa, path):
    response = spa.get(path, headers=HTML)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert "<title>spa</title>" in response.text


@pytest.mark.parametrize("path", ["/does-not-exist", "/admin/", "/admin/extra", "/wp-login.php"])
def test_unknown_navigation_serves_index_with_404(spa, path):
    """Visitors land on the site, but crawlers see a 404 and skip the URL."""
    response = spa.get(path, headers=HTML)
    assert response.status_code == 404
    assert "<title>spa</title>" in response.text


def test_head_navigation_gets_same_status(spa):
    assert spa.head("/admin", headers=HTML).status_code == 200
    assert spa.head("/nope", headers=HTML).status_code == 404


@pytest.mark.parametrize("path", ["/api/does-not-exist", "/api", "/ws/nope"])
def test_api_and_ws_misses_stay_json(spa, path):
    response = spa.get(path, headers=HTML)
    assert response.status_code == 404
    assert response.json() == {"detail": "Not Found"}


def test_missing_hashed_chunk_is_not_masked(spa):
    """A stale chunk must 404 loudly, not come back as HTML parsed as JS."""
    response = spa.get("/assets/app-deadbeef.js", headers=HTML)
    assert response.status_code == 404
    assert "<title>spa</title>" not in response.text


def test_non_html_requests_do_not_fall_back(spa):
    response = spa.get("/does-not-exist", headers={"accept": "application/json"})
    assert response.status_code == 404
    assert response.json() == {"detail": "Not Found"}


def test_non_get_methods_do_not_fall_back(spa):
    assert spa.post("/admin", headers=HTML).status_code == 405


def test_real_files_and_routes_still_win(spa):
    assert spa.get("/robots.txt", headers=HTML).text == "User-agent: *"
    assert spa.get("/assets/app-abc123.js").status_code == 200
    assert spa.get("/api/ping", headers=HTML).json() == {"ok": True}


@pytest.mark.skipif(not os.path.isfile(os.path.join(FRONTEND_DIST, "index.html")), reason="frontend not built")
def test_app_fallback_keeps_security_headers_and_no_cache(client):
    response = client.get("/admin", headers=HTML)
    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-cache"
    assert "default-src 'self'" in response.headers["Content-Security-Policy"]
    assert response.headers["X-Frame-Options"] == "DENY"

    missing = client.get("/does-not-exist", headers=HTML)
    assert missing.status_code == 404
    assert missing.headers["Cache-Control"] == "no-cache"
    assert missing.headers["content-type"].startswith("text/html")


def test_app_api_miss_is_json_404(client):
    response = client.get("/api/does-not-exist", headers=HTML)
    assert response.status_code == 404
    assert response.json() == {"detail": "Not Found"}
