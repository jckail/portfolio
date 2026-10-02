"""Host canonicalization: opt-in redirect from alias hosts, with open-redirect hardening."""
import asyncio
import dataclasses

import pytest
from starlette.applications import Starlette
from starlette.responses import PlainTextResponse
from starlette.routing import Route
from starlette.testclient import TestClient

from backend.app.config import get_settings, parse_alias_hosts
from backend.app.middleware.canonical_host import CanonicalHostMiddleware, build_target, normalise_host

CANON = "www.jckail.com"
ALIASES = ("jckail.com", "jordan-kail.com", "www.jordan-kail.com")


async def ok(request):
    return PlainTextResponse("ok")


def make_client(aliases=ALIASES):
    app = Starlette(routes=[Route("/{p:path}", ok, methods=["GET", "HEAD", "POST", "PUT", "DELETE"])])
    settings = dataclasses.replace(get_settings(), canonical_host=CANON, alias_hosts=tuple(aliases))
    app.add_middleware(CanonicalHostMiddleware, settings=settings)
    return TestClient(app, follow_redirects=False, base_url="http://testserver")


@pytest.mark.parametrize("host", ALIASES)
def test_alias_get_redirects_301(host):
    r = make_client().get("/projects?x=1&y=a%20b", headers={"host": host})
    assert r.status_code == 301
    assert r.headers["location"] == "https://www.jckail.com/projects?x=1&y=a%20b"


def test_head_redirects_and_port_and_case_are_ignored():
    r = make_client().head("/a", headers={"host": "JORDAN-Kail.com:443"})
    assert r.status_code == 301 and r.headers["location"] == "https://www.jckail.com/a"


def test_trailing_dot_host_is_an_alias():
    assert make_client().get("/", headers={"host": "jckail.com."}).status_code == 301


def test_root_path_and_no_query():
    r = make_client().get("/", headers={"host": "jckail.com"})
    assert r.headers["location"] == "https://www.jckail.com/"


def test_off_by_default_no_aliases():
    assert make_client(()).get("/", headers={"host": "jckail.com"}).status_code == 200


@pytest.mark.parametrize("method", ["POST", "PUT", "DELETE"])
def test_other_methods_never_redirect(method):
    r = make_client().request(method, "/x", headers={"host": "jckail.com"})
    assert r.status_code == 200


@pytest.mark.parametrize("path", ["/api/health", "/api/health/ready", "/ws/chat"])
def test_exempt_paths_never_redirect(path):
    assert make_client().get(path, headers={"host": "jckail.com"}).status_code == 200


@pytest.mark.parametrize(
    "host",
    [CANON, "quickresume-abc.a.run.app", "canary---quickresume-abc-uc.a.run.app", "localhost:8080",
     "127.0.0.1", "[::1]:8080", "evil.com", "jckail.com.evil.com", "evil.com/jckail.com", "", "jckail.com@evil.com"],
)
def test_non_alias_hosts_untouched(host):
    assert make_client().get("/x", headers={"host": host}).status_code == 200


def test_forwarded_host_headers_are_ignored():
    c = make_client()
    assert c.get("/", headers={"host": CANON, "x-forwarded-host": "jckail.com"}).status_code == 200
    r = c.get("/", headers={"host": "jckail.com", "x-forwarded-host": "evil.com", "forwarded": "host=evil.com"})
    assert r.headers["location"].startswith("https://www.jckail.com/")


@pytest.mark.parametrize(
    "path",
    ["//evil.com", "///evil.com/x", "//evil.com@x", "/\\evil.com", "/%2F%2Fevil.com", "/..//evil.com"],
)
def test_path_tricks_cannot_leave_the_canonical_host(path):
    r = make_client().get(path, headers={"host": "jckail.com"})
    assert r.status_code == 301
    loc = r.headers["location"]
    assert loc.startswith("https://www.jckail.com/")
    assert not loc.startswith("https://www.jckail.com//")


def test_encoded_newlines_stay_encoded():
    r = make_client().get("/a%0d%0aSet-Cookie:x=1?q=%0d%0a", headers={"host": "jckail.com"})
    loc = r.headers["location"]
    assert "\r" not in loc and "\n" not in loc and "%0d%0a" in loc.lower()


def test_query_cannot_inject_headers_or_hosts():
    r = make_client().get("/?next=https://evil.com&a=\\x", headers={"host": "jckail.com"})
    assert r.headers["location"].startswith("https://www.jckail.com/?next=https://evil.com")
    assert "evil.com" not in r.headers["location"].split("?")[0]


def test_build_target_rejects_non_origin_form():
    assert build_target(CANON, "http://evil.com/x", "") is None
    assert build_target(CANON, "", "") is None
    assert build_target(CANON, "//evil.com", "").startswith("https://www.jckail.com/evil.com")
    assert build_target(CANON, "/a b\r\n", "q=a b\r\n") == "https://www.jckail.com/a%20b%0D%0A?q=a%20b%0D%0A"


def _raw_scope(path, host="jckail.com", typ="http", method="GET", raw_path=None):
    return {"type": typ, "method": method, "path": path, "raw_path": raw_path if raw_path is not None else path.encode(),
            "query_string": b"", "headers": [(b"host", host.encode())]}


def _run(scope):
    sent, called = [], []

    async def app(s, r, snd):
        called.append(1)

    async def send(m):
        sent.append(m)

    async def receive():
        return {}

    settings = dataclasses.replace(get_settings(), canonical_host=CANON, alias_hosts=ALIASES)
    asyncio.run(CanonicalHostMiddleware(app, settings)(scope, receive, send))
    return sent, called


def test_absolute_uri_request_line_passes_through():
    sent, called = _run(_raw_scope("http://evil.com/x"))
    assert called and not sent


def test_websocket_scope_passes_through():
    sent, called = _run(_raw_scope("/ws/chat", typ="websocket", method=None))
    assert called and not sent


def test_lifespan_scope_passes_through():
    _, called = _run({"type": "lifespan"})
    assert called


def test_raw_path_preferred_so_encoding_is_preserved():
    sent, _ = _run(_raw_scope("/a b", raw_path=b"/a%20b"))
    assert dict(sent[0]["headers"])[b"location"] == b"https://www.jckail.com/a%20b"
    assert sent[0]["status"] == 301


def test_normalise_host():
    assert normalise_host(" JCKAIL.com:8080 ") == "jckail.com"
    assert normalise_host("[::1]:80") == "[::1]:80"
    assert normalise_host("") == ""


# --- settings validation -------------------------------------------------

def test_parse_alias_hosts_accepts_list_and_dedupes():
    assert parse_alias_hosts(" JCKAIL.com, jordan-kail.com ,jckail.com,", CANON) == ("jckail.com", "jordan-kail.com")
    assert parse_alias_hosts("", CANON) == ()


@pytest.mark.parametrize(
    "bad",
    ["https://jckail.com", "jckail.com/path", "jckail.com:443", "user@jckail.com", "localhost", "127.0.0.1",
     "x.run.app", "a b.com", "jckail", "-a.com", "jck\nail.com", "www.jckail.com"],
)
def test_parse_alias_hosts_rejects_bad_values(bad):
    with pytest.raises(ValueError):
        parse_alias_hosts(bad, CANON)


def test_settings_read_environment(monkeypatch):
    get_settings.cache_clear()
    monkeypatch.setenv("CANONICAL_HOST", "www.jckail.com")
    monkeypatch.setenv("ALIAS_HOSTS", "jckail.com,jordan-kail.com")
    try:
        s = get_settings()
        assert s.canonical_host == CANON and s.alias_hosts == ("jckail.com", "jordan-kail.com")
        monkeypatch.setenv("CANONICAL_HOST", "https://x.com")
        get_settings.cache_clear()
        with pytest.raises(ValueError):
            get_settings()
    finally:
        monkeypatch.setenv("CANONICAL_HOST", "")
        monkeypatch.setenv("ALIAS_HOSTS", "")
        get_settings.cache_clear()


def test_default_settings_leave_feature_off():
    s = get_settings()
    assert s.alias_hosts == () and s.canonical_host == CANON
