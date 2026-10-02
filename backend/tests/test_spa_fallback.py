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


@pytest.mark.parametrize("path", ["/", "/admin", "/dataplayground", "/dataplayground/"])
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


@pytest.mark.parametrize("accept", [{"accept": "*/*"}, {}, {"accept": "*/*;q=0.8"}])
@pytest.mark.parametrize("path", ["/admin", "/dataplayground", "/jobbr", "/gopilot", "/aibilling", "/cryptotrader"])
def test_wildcard_or_missing_accept_gets_known_routes(spa, path, accept):
    """Crawlers that send */* or no Accept are served like the home page."""
    response = spa.get(path, headers={**accept, "accept-encoding": "identity"})
    assert response.status_code == 200
    assert "<title>spa</title>" in response.text


@pytest.mark.parametrize("accept", [{"accept": "*/*"}, {}])
def test_home_serves_for_wildcard_or_missing_accept(spa, accept):
    assert spa.get("/", headers=accept).status_code == 200


@pytest.mark.parametrize("accept", [{"accept": "*/*"}, {}])
@pytest.mark.parametrize("path", ["/does-not-exist", "/admin/", "/api/nope", "/ws/nope", "/assets/app-deadbeef.js"])
def test_wildcard_accept_keeps_unknown_and_api_paths_404(spa, path, accept):
    response = spa.get(path, headers=accept)
    assert response.status_code == 404
    assert response.json() == {"detail": "Not Found"}


@pytest.mark.parametrize("accept", ["application/json", "application/json, */*", "application/json, text/plain, */*"])
def test_explicit_json_requests_do_not_get_lab_documents(spa, accept):
    response = spa.get("/jobbr", headers={"accept": accept})
    assert response.status_code == 404
    assert response.json() == {"detail": "Not Found"}


@pytest.mark.parametrize("method", ["GET", "HEAD"])
@pytest.mark.parametrize("accept", ["*/*;q=0", "*/*;q=0.000", "text/plain, */*;q=0"])
def test_refused_wildcard_does_not_enable_document_fallback(spa, method, accept):
    response = spa.request(method, "/jobbr", headers={"accept": accept})
    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/json")


@pytest.mark.parametrize("method", ["GET", "HEAD"])
@pytest.mark.parametrize("accept", [
    "application/json;q=0, */*;q=1",
    "application/problem+json; q=0.000, */*; q=0.8",
    "APPLICATION/JSON;Q=0, */*;Q=0.001",
])
def test_refused_json_does_not_veto_accepted_wildcard(spa, method, accept):
    response = spa.request(method, "/jobbr", headers={"accept": accept})
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")


@pytest.mark.parametrize("accept", ["application/json;q=0.001, */*", "application/problem+json;q=0.5, */*"])
def test_positive_json_weight_keeps_json_client_out_of_spa(spa, accept):
    response = spa.get("/jobbr", headers={"accept": accept})
    assert response.status_code == 404
    assert response.json() == {"detail": "Not Found"}


def test_genuinely_absent_accept_serves_only_known_routes(spa):
    # TestClient otherwise supplies */*, so an empty headers dict is not a
    # regression test for a truly absent Accept header.
    del spa.headers["accept"]
    assert spa.get("/jobbr").status_code == 200
    response = spa.get("/does-not-exist")
    assert response.status_code == 404
    assert response.json() == {"detail": "Not Found"}


@pytest.mark.parametrize("path", ["/does-not-exist", "/api/nope", "/ws/nope", "/assets/missing.js"])
def test_refused_json_wildcard_still_never_masks_a_missing_route(spa, path):
    response = spa.get(path, headers={"accept": "application/json;q=0, */*"})
    assert response.status_code == 404
    assert response.json() == {"detail": "Not Found"}


def test_explicit_html_navigation_keeps_its_existing_precedence(spa):
    response = spa.get("/jobbr", headers={"accept": "application/json, text/html, */*"})
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")


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


# --- Pre-compressed static files --------------------------------------------

BIG_JS = "export const data = " + repr(list(range(2000))) + ";\n"
GZ = {"accept-encoding": "gzip"}


@pytest.fixture()
def gz_spa(tmp_path):
    (tmp_path / "index.html").write_text("<!doctype html><title>spa</title>")
    (tmp_path / "assets").mkdir()
    (tmp_path / "assets" / "big-abc123.js").write_text(BIG_JS)
    (tmp_path / "assets" / "tiny-abc123.js").write_text("console.log(1)")
    (tmp_path / "assets" / "logo.png").write_bytes(b"\x89PNG" + bytes(4096))
    files = SPAStaticFiles(directory=str(tmp_path), html=True)
    app = FastAPI()
    app.mount("/", files, name="frontend")
    return TestClient(app), files, tmp_path


def test_text_assets_are_served_from_the_gzip_cache(gz_spa):
    client, files, _ = gz_spa
    response = client.get("/assets/big-abc123.js", headers=GZ)
    assert response.status_code == 200
    assert response.headers["content-encoding"] == "gzip"
    assert response.headers["content-type"].startswith("text/javascript")
    assert response.headers["vary"] == "Accept-Encoding"
    assert int(response.headers["content-length"]) < len(BIG_JS)
    assert response.text == BIG_JS
    assert response.headers["etag"].endswith('-gz"')

    # Compressed once, then reused.
    entry = next(iter(files.gzip_cache._entries.values()))
    assert client.get("/assets/big-abc123.js", headers=GZ).headers["etag"] == entry.etag
    assert len(files.gzip_cache._entries) == 1


def test_gzip_variant_revalidates_with_its_own_etag(gz_spa):
    client, _, _ = gz_spa
    etag = client.get("/assets/big-abc123.js", headers=GZ).headers["etag"]
    response = client.get("/assets/big-abc123.js", headers={**GZ, "if-none-match": etag})
    assert response.status_code == 304
    assert response.content == b""

    identity = client.get("/assets/big-abc123.js", headers={"accept-encoding": "identity"})
    assert identity.status_code == 200
    assert "content-encoding" not in identity.headers
    assert identity.headers["etag"] != etag


@pytest.mark.parametrize(
    "method, headers",
    [("HEAD", GZ), ("GET", {**GZ, "range": "bytes=0-9"}), ("GET", {"accept-encoding": "br"})],
)
def test_head_range_and_non_gzip_clients_get_the_plain_file(gz_spa, method, headers):
    client, files, _ = gz_spa
    response = client.request(method, "/assets/big-abc123.js", headers=headers)
    assert response.headers.get("content-encoding") != "gzip"
    assert files.gzip_cache._entries == {}


@pytest.mark.parametrize("path", ["/assets/tiny-abc123.js", "/assets/logo.png"])
def test_small_and_binary_files_are_not_cached(gz_spa, path):
    client, files, _ = gz_spa
    assert client.get(path, headers=GZ).status_code == 200
    assert files.gzip_cache._entries == {}


def test_a_rewritten_file_is_recompressed(gz_spa):
    client, _, root = gz_spa
    first = client.get("/assets/big-abc123.js", headers=GZ)
    target = root / "assets" / "big-abc123.js"
    target.write_text(BIG_JS + "// rebuilt\n" * 10)
    stat = target.stat()
    os.utime(target, ns=(stat.st_atime_ns, stat.st_mtime_ns + 1_000_000_000))

    second = client.get("/assets/big-abc123.js", headers=GZ)
    assert second.text.endswith("// rebuilt\n")
    assert second.headers["etag"] != first.headers["etag"]


def test_warm_compresses_the_tree_up_front(gz_spa):
    _, files, _ = gz_spa
    files.warm_gzip_cache()
    assert len(files.gzip_cache._entries) == 1  # only the big JS file qualifies


def test_gzip_cache_respects_its_byte_budget(tmp_path):
    from backend.app.spa import GzipCache

    path = tmp_path / "a.js"
    path.write_text(BIG_JS)
    cache = GzipCache(max_bytes=10)
    entry = cache.get(str(path), path.stat())
    assert entry is not None and entry.body  # still served...
    assert cache._entries == {}  # ...but not retained


@pytest.fixture()
def document_spa(tmp_path):
    from pathlib import Path

    source = Path(__file__).parents[2] / "frontend" / "index.html"
    (tmp_path / "index.html").write_bytes(source.read_bytes())
    files = SPAStaticFiles(
        directory=str(tmp_path), html=True, bootstrap=lambda: b'{"ready":true}',
        snapshot=lambda: b'<main id="home-snapshot">Home</main>',
        jsonld=lambda: b'{"@type":"ProfilePage"}',
    )
    app = FastAPI()
    app.mount("/", files)
    return TestClient(app), files


@pytest.mark.parametrize("path", ["/dataplayground", "/dataplayground/"])
def test_lab_document_has_own_metadata_snapshot_and_canonical(document_spa, path):
    import json
    import re
    from html import escape

    from backend.app.models.data_loader import load_projects

    client, _ = document_spa
    project = load_projects().root["data_playground"]
    response = client.get(path, headers=HTML)
    assert response.status_code == 200
    assert "x-robots-tag" not in response.headers
    assert response.headers["link"] == '<https://www.jckail.com/dataplayground>; rel="canonical"'
    assert f"<title>{escape(project.title.strip())} | Jordan Kail</title>" in response.text
    assert f'<meta name="description" content="{escape(project.description, quote=True)}"' in response.text
    assert '<link rel="canonical" href="https://www.jckail.com/dataplayground"' in response.text
    assert '<meta property="og:type" content="website"' in response.text
    assert '<meta property="og:url" content="https://www.jckail.com/dataplayground"' in response.text
    assert '<meta name="twitter:url" content="https://www.jckail.com/dataplayground"' in response.text
    assert 'property="profile:' not in response.text
    assert 'id="seo-snapshot"' in response.text
    assert 'id="home-snapshot"' not in response.text
    assert "All data is synthetic" in response.text
    assert 'id="bootstrap-data"' in response.text
    graph = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', response.text, re.S)[1])
    assert graph["@type"] == "WebApplication"
    assert graph["name"] == project.title.strip()
    assert graph["url"] == "https://www.jckail.com/dataplayground"
    assert "aggregateRating" not in graph
    head = client.head(path, headers=HTML)
    assert head.status_code == 200
    assert head.content == b""
    assert head.headers["link"] == response.headers["link"]
    assert head.headers["etag"] == response.headers["etag"]


def test_lab_home_and_bare_variants_do_not_share_cache(document_spa):
    client, files = document_spa
    files.warm_gzip_cache()
    home = client.get("/", headers=HTML)
    lab = client.get("/dataplayground", headers=HTML)
    admin = client.get("/admin", headers=HTML)
    assert len({r.headers["etag"] for r in (home, lab, admin)}) == 3
    # Hosted demo labs add their own namespaced entries ("hosted:<slug>"); nothing
    # else may appear, and none of them may collide with the three base variants.
    keys = set(files._index)
    assert {"home", "lab", "bare"} <= keys
    assert all(k.startswith("hosted:") for k in keys - {"home", "lab", "bare"})
    assert 'id="home-snapshot"' in home.text
    assert '"@type":"ProfilePage"' in home.text
    assert 'id="seo-snapshot"' not in admin.text
    assert admin.headers["x-robots-tag"] == "noindex"
    assert client.get("/dataplayground", headers={**HTML, "if-none-match": home.headers["etag"]}).status_code == 200
    assert client.get("/dataplayground", headers={**HTML, "if-none-match": lab.headers["etag"]}).status_code == 304
    plain = client.get("/dataplayground", headers={**HTML, "accept-encoding": "identity"})
    assert plain.text == lab.text
    assert plain.headers["etag"] != lab.headers["etag"]
    missing = client.get("/dataplayground/missing", headers=HTML)
    assert missing.status_code == 404
    assert missing.headers["x-robots-tag"] == "noindex"
    assert missing.headers["etag"] == admin.headers["etag"]
    assert client.get("/", headers=HTML).text == home.text


def test_lab_document_escapes_project_content(monkeypatch):
    import json
    import re
    from pathlib import Path
    from types import SimpleNamespace

    from backend.app import dataplayground_document as document
    from backend.app.models.data_loader import load_projects

    project = load_projects().root["data_playground"].model_copy(update={
        "title": '<script>alert("title")</script>',
        "description": '</script><script>alert("description")</script>',
        "description_detail": '<img src=x onerror="alert(1)">',
    })
    monkeypatch.setattr(document, "load_projects", lambda: SimpleNamespace(root={"data_playground": project}))
    source = Path(__file__).parents[2] / "frontend" / "index.html"
    html = document.render_document(source.read_bytes()).decode()
    assert '<script>alert("title")</script>' not in html
    assert '<img src=x onerror=' not in html
    assert "&lt;img" in html
    graph = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)[1])
    assert graph["description"] == project.description
