"""index.html carries the first-render content as an inert JSON data block."""
import json
import os
from html.parser import HTMLParser

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.app.api import content
from backend.app.middleware.response_headers import build_csp
from backend.app.models import load_aboutme, load_contact, load_experience, load_projects, load_skills
from backend.app.spa import BOOTSTRAP_ELEMENT_ID, SPAStaticFiles, inject_bootstrap

HTML = {"accept": "text/html,application/xhtml+xml,*/*;q=0.8"}
INDEX = "<!doctype html><html><head><title>spa</title></head><body><div id=\"root\"></div></body></html>"
HOSTILE = {
    "greeting": "</script><script>alert(1)</script>",
    "comment": "<!-- <script> -->",
    "entity": "&lt;b&gt; & >",
    "separators": "a b c",
    "case": "</SCRIPT >",
}
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")


class _Scripts(HTMLParser):
    """Collects every <script> element's attributes and raw text."""

    def __init__(self) -> None:
        super().__init__()
        self.scripts: list[tuple[dict, str]] = []
        self._open: dict | None = None
        self._text = ""

    def handle_starttag(self, tag, attrs):
        if tag == "script":
            self._open, self._text = dict(attrs), ""

    def handle_data(self, data):
        if self._open is not None:
            self._text += data

    def handle_endtag(self, tag):
        if tag == "script" and self._open is not None:
            self.scripts.append((self._open, self._text))
            self._open = None


def scripts_in(html: str) -> list[tuple[dict, str]]:
    parser = _Scripts()
    parser.feed(html)
    return parser.scripts


def bootstrap_block(html: str) -> str:
    blocks = [text for attrs, text in scripts_in(html) if attrs.get("id") == BOOTSTRAP_ELEMENT_ID]
    assert len(blocks) == 1
    return blocks[0]


# --- Escaping -----------------------------------------------------------------


def test_script_safe_leaves_no_markup_and_round_trips():
    raw = json.dumps(HOSTILE, ensure_ascii=False).encode()
    safe = content.script_safe(raw)
    assert b"<" not in safe and b">" not in safe and b"&" not in safe
    assert " ".encode() not in safe and " ".encode() not in safe
    assert json.loads(safe) == HOSTILE


def test_inject_refuses_unescaped_markup():
    with pytest.raises(ValueError):
        inject_bootstrap(INDEX.encode(), b'{"x":"</script>"}')


def test_hostile_data_cannot_break_out_of_the_block():
    data = content.script_safe(json.dumps({"aboutMe": HOSTILE}, ensure_ascii=False).encode())
    html = inject_bootstrap(INDEX.encode(), data).decode()
    scripts = scripts_in(html)
    # Exactly one script element exists: nothing in the data opened another.
    assert len(scripts) == 1
    attrs, text = scripts[0]
    assert attrs == {"type": "application/json", "id": BOOTSTRAP_ELEMENT_ID}
    assert json.loads(text) == {"aboutMe": HOSTILE}
    assert html.index(f'id="{BOOTSTRAP_ELEMENT_ID}"') < html.index("</body>")


def test_bootstrap_json_matches_the_content_api():
    data = json.loads(content.bootstrap_json())
    assert data == {
        "aboutMe": load_aboutme().model_dump(mode="json"),
        "contact": load_contact().model_dump(mode="json"),
        "experience": load_experience().model_dump(mode="json"),
        "projects": load_projects().model_dump(mode="json"),
        "skills": load_skills().model_dump(mode="json"),
    }
    assert b"<" not in content.bootstrap_json()


def test_csp_still_forbids_inline_scripts():
    """The block is a data block; it must not need 'unsafe-inline' or a hash."""
    from backend.app.config import get_settings

    csp = build_csp(get_settings())
    script_src = next(d for d in csp.split(";") if d.strip().startswith("script-src"))
    assert "'unsafe-inline'" not in script_src
    assert "sha256-" not in script_src and "nonce-" not in script_src


# --- Serving --------------------------------------------------------------------


@pytest.fixture()
def boot_spa(tmp_path):
    (tmp_path / "index.html").write_text(INDEX)
    payload = content.script_safe(json.dumps({"aboutMe": HOSTILE}, ensure_ascii=False).encode())
    calls = []

    def bootstrap() -> bytes:
        calls.append(1)
        return payload

    files = SPAStaticFiles(directory=str(tmp_path), html=True, bootstrap=bootstrap)
    app = FastAPI()
    app.mount("/", files, name="frontend")
    return TestClient(app), files, tmp_path, calls


@pytest.mark.parametrize("path, status", [("/", 200), ("/admin", 200), ("/nope", 404)])
def test_every_index_response_carries_the_block(boot_spa, path, status):
    client, _, _, _ = boot_spa
    response = client.get(path, headers={**HTML, "accept-encoding": "identity"})
    assert response.status_code == status
    assert response.headers["content-type"].startswith("text/html")
    assert "content-encoding" not in response.headers
    assert json.loads(bootstrap_block(response.text)) == {"aboutMe": HOSTILE}


def test_gzip_variant_and_revalidation(boot_spa):
    client, _, _, calls = boot_spa
    plain = client.get("/", headers={"accept-encoding": "identity"})
    zipped = client.get("/", headers={"accept-encoding": "gzip"})
    assert zipped.headers["content-encoding"] == "gzip"
    assert zipped.headers["vary"] == "Accept-Encoding"
    assert zipped.text == plain.text
    assert zipped.headers["etag"] == plain.headers["etag"][:-1] + '-gz"'
    # Revalidates by content hash only; mtime would go stale on a data-only change.
    assert "last-modified" not in plain.headers

    not_modified = client.get("/", headers={"accept-encoding": "gzip", "if-none-match": zipped.headers["etag"]})
    assert not_modified.status_code == 304
    assert not_modified.content == b""
    assert len(calls) == 1  # built once, then reused


def test_a_rebuilt_index_is_reinjected(boot_spa):
    client, _, root, calls = boot_spa
    first = client.get("/", headers={"accept-encoding": "identity"})
    target = root / "index.html"
    target.write_text(INDEX.replace("spa", "rebuilt"))
    stat = target.stat()
    os.utime(target, ns=(stat.st_atime_ns, stat.st_mtime_ns + 1_000_000_000))

    second = client.get("/", headers={"accept-encoding": "identity"})
    assert "<title>rebuilt</title>" in second.text
    assert second.headers["etag"] != first.headers["etag"]
    bootstrap_block(second.text)
    assert len(calls) == 2


def test_without_a_bootstrap_index_is_served_untouched(tmp_path):
    (tmp_path / "index.html").write_text(INDEX)
    app = FastAPI()
    app.mount("/", SPAStaticFiles(directory=str(tmp_path), html=True), name="frontend")
    assert TestClient(app).get("/", headers=HTML).text == INDEX


def test_other_files_are_not_injected(boot_spa):
    client, _, root, _ = boot_spa
    (root / "other.html").write_text(INDEX)
    assert client.get("/other.html").text == INDEX


@pytest.mark.skipif(
    not os.path.isfile(os.path.join(FRONTEND_DIST, "index.html")), reason="frontend not built"
)
def test_the_app_serves_the_real_index_with_content_and_strict_csp(client):
    response = client.get("/", headers={**HTML, "accept-encoding": "gzip"})
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-cache"
    assert "'unsafe-inline'" not in next(
        d for d in response.headers["content-security-policy"].split(";") if "script-src" in d
    )
    data = json.loads(bootstrap_block(response.text))
    assert set(data) == set(content.BOOTSTRAP_KEYS)
    assert data["contact"] == load_contact().model_dump(mode="json")
