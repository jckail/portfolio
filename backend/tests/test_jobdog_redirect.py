"""jckail.com/jobbr forwards to the Jobdog app, and can never be steered to another host."""
from urllib.parse import urlsplit

import pytest
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.testclient import TestClient

from backend.app.jobdog_redirect import JOBDOG_APP_URL, router, target_for

NO_FOLLOW = {"follow_redirects": False}


def test_bare_and_slash_forms_go_to_the_app(client):
    for path in ("/jobbr", "/jobbr/"):
        r = client.get(path, **NO_FOLLOW)
        assert r.status_code == 302
        assert r.headers["location"] == "https://jobdog.ai/jobbr/"


def test_path_and_query_are_preserved(client):
    r = client.get("/jobbr/jobs/12?x=1&y=a%20b", **NO_FOLLOW)
    assert r.status_code == 302
    assert r.headers["location"] == "https://jobdog.ai/jobbr/jobs/12?x=1&y=a%20b"


def test_trailing_slash_on_a_deep_path_is_kept(client):
    assert client.get("/jobbr/a/b/", **NO_FOLLOW).headers["location"] == "https://jobdog.ai/jobbr/a/b/"


def test_head_redirects_too(client):
    r = client.head("/jobbr/jobs", **NO_FOLLOW)
    assert r.status_code == 302 and r.headers["location"] == "https://jobdog.ai/jobbr/jobs"


@pytest.mark.parametrize("host", ["jckail.com", "www.jckail.com"])
def test_works_on_both_hostnames(client, host):
    r = client.get("/jobbr/", headers={"host": host}, **NO_FOLLOW)
    assert r.status_code == 302 and r.headers["location"] == "https://jobdog.ai/jobbr/"


def test_it_is_temporary_so_browsers_do_not_cache_it_forever(client):
    r = client.get("/jobbr", **NO_FOLLOW)
    assert r.status_code == 302
    assert "max-age" not in r.headers.get("cache-control", "").replace("max-age=0", "")


def test_other_methods_are_not_forwarded(client):
    assert client.post("/jobbr/api/jobs", json={}, **NO_FOLLOW).status_code in (404, 405)


def test_similar_prefixes_are_not_captured(client):
    for path in ("/jobbrx", "/jobbr-old"):
        r = client.get(path, **NO_FOLLOW)
        assert "jobdog.ai" not in r.headers.get("location", "")


@pytest.mark.parametrize(
    "path",
    [
        "/jobbr//evil.com",
        "/jobbr///evil.com/x",
        "/jobbr/%2e%2e/%2e%2e/evil.com",
        "/jobbr/..%2f..%2fevil.com",
        "/jobbr/%5Cevil.com",
        "/jobbr/@evil.com",
        "/jobbr/https://evil.com",
        "/jobbr/a%00b",
    ],
)
def test_a_crafted_path_cannot_leave_jobdog(client, path):
    r = client.get(path, **NO_FOLLOW)
    assert r.status_code == 302
    location = r.headers["location"]
    parts = urlsplit(location)
    assert (parts.scheme, parts.netloc) == ("https", "jobdog.ai")
    assert parts.path.startswith("/jobbr/")
    assert "\r" not in location and "\n" not in location and "\\" not in location


@pytest.mark.parametrize("path", ["/jobbr/%0d%0aSet-Cookie:%20x=1", "/jobbr/a%0ab"])
def test_a_newline_in_the_path_never_reaches_a_header(client, path):
    """The route pattern does not match newlines, so this falls through to a plain 404."""
    r = client.get(path, **NO_FOLLOW)
    assert r.status_code in (302, 404)
    location = r.headers.get("location", "")
    assert "\r" not in location and "\n" not in location
    if r.status_code == 302:
        assert urlsplit(location).netloc == "jobdog.ai"


def test_target_for_normalises_without_losing_meaning():
    assert target_for("", "") == JOBDOG_APP_URL
    assert target_for("a/b", "q=1") == JOBDOG_APP_URL + "a/b?q=1"
    assert target_for("a b/ü", "") == JOBDOG_APP_URL + "a%20b/%C3%BC"
    assert target_for("a/../b", "") == JOBDOG_APP_URL  # dot segments never climb out of /jobbr/


def test_it_wins_over_the_single_page_app_catch_all(tmp_path):
    """The app mounts the SPA at "/" on startup; this route must still take /jobbr."""
    (tmp_path / "index.html").write_text("<html>spa</html>")
    app = FastAPI()
    app.include_router(router)
    app.mount("/", StaticFiles(directory=tmp_path, html=True), name="frontend")
    client = TestClient(app)
    assert client.get("/jobbr", **NO_FOLLOW).status_code == 302
    assert client.get("/jobbr/jobs", **NO_FOLLOW).status_code == 302
    assert "spa" in client.get("/", **NO_FOLLOW).text  # everything else still reaches the site
