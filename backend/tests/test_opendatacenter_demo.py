"""Proposed offline route/startup/config regressions; not a live release proof."""
from dataclasses import replace
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.app import opendatacenter_proxy as gateway
from backend.app.config import get_settings
from backend.app.middleware.response_headers import ResponseHeadersMiddleware

PACKAGE = Path(__file__).resolve().parents[2] / "static-demos" / "opendatacenter"


def demo_settings():
    return replace(get_settings(), opendatacenter_synthetic_demo=True, opendatacenter_upstream_url="")


@pytest.fixture
def demo(monkeypatch):
    monkeypatch.setattr(gateway, "DEMO_ROOT", PACKAGE)
    def forbidden_client(**kwargs):
        raise AssertionError("Synthetic demo must never construct upstream transport")
    monkeypatch.setattr(gateway, "_client_factory", forbidden_client)
    settings = demo_settings()
    app = FastAPI()
    app.include_router(gateway.router)
    app.dependency_overrides[get_settings] = lambda: settings
    app.add_middleware(ResponseHeadersMiddleware, settings=settings)
    app.state.opendatacenter_demo = gateway.load_synthetic_demo(settings)
    with TestClient(app) as client:
        yield client, app


@pytest.mark.parametrize("name", ["", "index.html", "styles.css", "app.js"])
@pytest.mark.parametrize("method", ["GET", "HEAD"])
def test_exact_approved_bytes_and_closed_csp(demo, name, method):
    client, _ = demo
    response = client.request(method, "/opendatacenter/" + name + "?q=fictional")
    actual = (PACKAGE / (name or "index.html")).read_bytes()
    assert response.status_code == 200
    assert response.content == (actual if method == "GET" else b"")
    assert response.headers["content-length"] == str(len(actual))
    assert response.headers["content-type"] == gateway.DEMO_FILES[name or "index.html"][2]
    assert response.headers["cache-control"] == "no-cache"
    assert response.headers["x-content-type-options"] == "nosniff"
    csp = response.headers["content-security-policy"]
    assert "connect-src 'none'" in csp and "worker-src 'none'" in csp
    assert "unsafe-inline" not in csp and "https:" not in csp and "google" not in csp


@pytest.mark.parametrize("method", ["GET", "HEAD"])
def test_canonical_slash_preserves_query(demo, method):
    response = demo[0].request(method, "/opendatacenter?q=demo", follow_redirects=False)
    assert response.status_code == 308
    assert response.headers["location"] == "/opendatacenter/?q=demo"


@pytest.mark.parametrize("path", ["manifest.json", "assets/app.js", "v1/facilities", "mcp", "mcp/", "admin", "research", "missing.js", "%61pp.js", "%2e%2e/app.js", "%2fapp.js", "app.js%00", "x\\app.js"])
@pytest.mark.parametrize("method", ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"])
def test_denied_paths_never_fall_back_or_call_upstream(demo, path, method):
    response = demo[0].request(method, "/opendatacenter/" + path)
    assert response.status_code == 404
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize("path", ["/opendatacenter", "/opendatacenter/", "/opendatacenter/app.js"])
@pytest.mark.parametrize("method", ["POST", "PUT", "PATCH", "DELETE"])
def test_all_writes_denied(demo, path, method):
    assert demo[0].request(method, path).status_code == 404


def test_missing_startup_cache_cannot_fall_through(demo):
    client, app = demo
    del app.state.opendatacenter_demo
    assert client.get("/opendatacenter/").status_code == 404
    assert client.get("/opendatacenter", follow_redirects=False).status_code == 404


def test_cached_bytes_served_without_request_file_io(demo, monkeypatch):
    client, _ = demo
    def forbidden_read(*args, **kwargs):
        raise AssertionError("Request performed filesystem I/O")
    monkeypatch.setattr(gateway, "_read_demo_file", forbidden_read)
    assert client.get("/opendatacenter/app.js").content == (PACKAGE / "app.js").read_bytes()


@pytest.mark.parametrize("mode", ["missing", "digest", "manifest", "oversize", "extra", "symlink", "directory", "ancestor"])
def test_startup_rejects_unapproved_or_unsafe_package(tmp_path, monkeypatch, mode):
    root = tmp_path / "package"
    root.mkdir()
    for file in PACKAGE.iterdir():
        (root / file.name).write_bytes(file.read_bytes())
    if mode == "missing":
        (root / "app.js").unlink()
    elif mode == "digest":
        (root / "app.js").write_bytes(b"unapproved")
    elif mode == "manifest":
        (root / "manifest.json").write_text('{}')
    elif mode == "oversize":
        (root / "app.js").write_bytes(b"x" * 65537)
    elif mode == "extra":
        (root / "private.json").write_text('{}')
    elif mode == "symlink":
        (root / "app.js").unlink()
        (root / "app.js").symlink_to(PACKAGE / "app.js")
    elif mode == "directory":
        (root / "app.js").unlink()
        (root / "app.js").mkdir()
    else:
        alias = tmp_path / "alias"
        alias.symlink_to(root, target_is_directory=True)
        root = alias
    monkeypatch.setattr(gateway, "DEMO_ROOT", root)
    with pytest.raises(ValueError, match="package validation failed"):
        gateway.load_synthetic_demo(demo_settings())


def test_flag_default_and_conflict(monkeypatch):
    monkeypatch.delenv("OPENDATACENTER_SYNTHETIC_DEMO", raising=False)
    get_settings.cache_clear()
    try:
        assert not get_settings().opendatacenter_synthetic_demo
        with pytest.raises(ValueError, match="mutually exclusive"):
            replace(demo_settings(), opendatacenter_upstream_url="https://example.a.run.app")
        monkeypatch.setenv("OPENDATACENTER_SYNTHETIC_DEMO", "invalid")
        get_settings.cache_clear()
        with pytest.raises(ValueError, match="must be a boolean"):
            get_settings()
    finally:
        get_settings.cache_clear()


def test_disabled_mode_does_not_read_package(monkeypatch):
    monkeypatch.setattr(gateway, "DEMO_ROOT", Path("/definitely/missing/package"))
    assert not gateway.load_synthetic_demo(replace(get_settings(), opendatacenter_synthetic_demo=False))


def test_actual_startup_validates_in_worker_before_integrations(tmp_path, monkeypatch):
    import asyncio
    import threading

    from backend.app import main
    monkeypatch.setattr(main, "settings", demo_settings())
    monkeypatch.setattr(gateway, "DEMO_ROOT", tmp_path / "missing")
    original = gateway.load_synthetic_demo
    threads = []
    def observed_load(settings):
        threads.append(threading.get_ident())
        return original(settings)
    def forbidden_integration(*args, **kwargs):
        raise AssertionError("Unapproved package reached startup integration")
    monkeypatch.setattr(main, "load_synthetic_demo", observed_load)
    monkeypatch.setattr(main, "get_supabase_handler", forbidden_integration)
    monkeypatch.setattr(main, "initialize_supabase", forbidden_integration)
    with pytest.raises(ValueError, match="package validation failed"):
        asyncio.run(main.lifespan(main.app).__aenter__())
    assert threads and threads[0] != threading.get_ident()
