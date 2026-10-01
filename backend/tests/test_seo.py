"""The server-rendered snapshot, JSON-LD and head tags that make the SPA legible to crawlers."""
import json
import os
import re
from html.parser import HTMLParser

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.app.api import content, discovery
from backend.app.api.discovery import SNAPSHOT_ID
from backend.app.config import get_settings
from backend.app.middleware.response_headers import ResponseHeadersMiddleware
from backend.app.models import load_experience, load_projects, load_skills
from backend.app.models.aboutme import AboutMe
from backend.app.spa import BOOTSTRAP_ELEMENT_ID, SPAStaticFiles

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
INDEX_SOURCE = os.path.join(ROOT, "frontend", "index.html")
PUBLIC = os.path.join(ROOT, "frontend", "public")
HTML = {"accept": "text/html,application/xhtml+xml,*/*;q=0.8", "accept-encoding": "identity"}
PHONE_LIKE = re.compile(r"(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}")

CRAWLERS = [
    "GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-Web", "anthropic-ai",
    "PerplexityBot", "Google-Extended", "Googlebot", "Bingbot", "Applebot-Extended", "CCBot",
]


class Page(HTMLParser):
    """Collects headings, list items, meta/link tags, scripts and the #root subtree text."""

    def __init__(self) -> None:
        super().__init__()
        self.headings: list[tuple[str, str]] = []
        self.items: list[str] = []
        self.meta: list[dict] = []
        self.links: list[dict] = []
        self.scripts: list[tuple[dict, str]] = []
        self.times: list[dict] = []
        self.root_depth = 0
        self.root_html_tags: list[str] = []
        self._stack: list[str] = []
        self._buf = ""
        self._script: dict | None = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "meta":
            self.meta.append(a)
        elif tag == "link":
            self.links.append(a)
        elif tag == "script":
            self._script, self._buf = a, ""
        elif tag == "time":
            self.times.append(a)
        elif tag in ("h1", "h2", "h3", "li"):
            self._stack.append(tag)
            self._buf = ""
        if a.get("id") == "root":
            self.root_depth = 1
        elif self.root_depth and tag not in ("meta", "link", "br", "img"):
            self.root_depth += 1
            self.root_html_tags.append(tag)

    def handle_data(self, data):
        if self._script is not None or self._stack:
            self._buf += data

    def handle_endtag(self, tag):
        if tag == "script" and self._script is not None:
            self.scripts.append((self._script, self._buf))
            self._script = None
        elif self._stack and self._stack[-1] == tag:
            self._stack.pop()
            text = self._buf.strip()
            if tag == "li":
                self.items.append(text)
            else:
                self.headings.append((tag, text))
        if self.root_depth:
            self.root_depth -= 1


def parse(html: str) -> Page:
    page = Page()
    page.feed(html)
    return page


def meta(page: Page, **match) -> dict | None:
    return next((m for m in page.meta if all(m.get(k) == v for k, v in match.items())), None)


@pytest.fixture(scope="module")
def site(tmp_path_factory):
    """The real index.html source served the way production serves it."""
    root = tmp_path_factory.mktemp("dist")
    with open(INDEX_SOURCE, encoding="utf-8") as src:
        (root / "index.html").write_text(src.read(), encoding="utf-8")
    app = FastAPI()
    app.add_middleware(ResponseHeadersMiddleware, settings=get_settings())
    app.mount("/", SPAStaticFiles(directory=str(root), html=True, bootstrap=content.bootstrap_json), name="frontend")
    return TestClient(app)


@pytest.fixture(scope="module")
def home(site):
    response = site.get("/", headers=HTML)
    assert response.status_code == 200
    return response


# --- Snapshot --------------------------------------------------------------------


def test_the_home_page_carries_the_snapshot_inside_root(home):
    page = parse(home.text)
    assert f'<div id="root"><main id="{SNAPSHOT_ID}"' in home.text
    levels = [t for t, _ in page.headings]
    assert levels.count("h1") == 1
    assert ("h1", "Jordan Kail") in page.headings
    for section in ("Experience", "Projects", "Skills", "Links"):
        assert ("h2", section) in page.headings


def test_the_snapshot_has_the_current_role_and_every_job_and_bullet(home):
    page = parse(home.text)
    assert "Staff Software Engineer at Together AI" in home.text
    headings = [text for tag, text in page.headings if tag == "h3"]
    for job in load_experience().root.values():
        assert f"{job.title}, {job.company}" in headings
        for bullet in job.highlights:
            assert bullet.strip() in page.items
    for project in load_projects().root.values():
        assert project.title.strip() in headings
    for skill in load_skills().root.values():
        assert skill.display_name in page.items


def test_the_snapshot_uses_time_elements_for_dates(home):
    page = parse(home.text)
    stamps = [t["datetime"] for t in page.times]
    assert "2025-02" in stamps and "2021-01" in stamps and "2022-09" in stamps


def test_the_snapshot_has_no_phone_and_no_email(home):
    snapshot = home.text[home.text.index(f'<main id="{SNAPSHOT_ID}"'):home.text.index("</main>")]
    assert not PHONE_LIKE.search(snapshot)
    assert "tel:" not in snapshot and "mailto:" not in snapshot and "@" not in snapshot


def test_the_snapshot_escapes_hostile_content(monkeypatch):
    hostile = AboutMe(
        greeting="<script>alert(1)</script>", description='"><img src=x onerror=alert(1)>',
        aidetails="x", brief_bio="<b>bold</b> & more\n\n</main><h1>pwned</h1>",
        full_portrait="/x.webp", resume_name="x.pdf", primary_skills=[],
    )
    monkeypatch.setattr(discovery, "load_aboutme", lambda: hostile)
    discovery.snapshot_html.cache_clear()
    try:
        out = discovery.snapshot_html().decode()
    finally:
        monkeypatch.undo()
        discovery.snapshot_html.cache_clear()
    assert "<script" not in out and "<img" not in out and "<b>" not in out and "<h1>pwned" not in out
    assert "&lt;script&gt;" in out and "&amp; more" in out


def test_admin_and_unknown_urls_get_the_bare_shell_and_noindex(site):
    for path, status in (("/admin", 200), ("/nope", 404)):
        response = site.get(path, headers=HTML)
        assert response.status_code == status
        assert f'<main id="{SNAPSHOT_ID}"' not in response.text
        assert response.headers["x-robots-tag"] == "noindex"
        assert "link" not in response.headers
        assert BOOTSTRAP_ELEMENT_ID in response.text  # the SPA still boots


# --- Headers ---------------------------------------------------------------------


def test_home_sends_link_alternates_and_is_never_cached(home):
    link = home.headers["link"]
    assert '<https://www.jckail.com/>; rel="canonical"' in link
    assert 'https://www.jckail.com/llms.txt>; rel="alternate"; type="text/plain"' in link
    assert 'https://www.jckail.com/resume.json>; rel="alternate"; type="application/json"' in link
    assert 'https://www.jckail.com/api/resume>; rel="alternate"; type="application/pdf"' in link
    assert home.headers["cache-control"] == "no-cache"
    assert "x-robots-tag" not in home.headers


def test_the_csp_is_still_strict_and_every_inline_script_is_data(home):
    script_src = next(d for d in home.headers["content-security-policy"].split(";") if "script-src" in d)
    assert "'unsafe-inline'" not in script_src and "nonce-" not in script_src and "sha256-" not in script_src
    for attrs, _ in parse(home.text).scripts:
        if "src" not in attrs:
            assert attrs.get("type") in ("application/json", "application/ld+json"), attrs


def test_bootstrap_injection_is_intact_next_to_the_snapshot(home):
    page = parse(home.text)
    blocks = [text for attrs, text in page.scripts if attrs.get("id") == BOOTSTRAP_ELEMENT_ID]
    assert len(blocks) == 1
    assert json.loads(blocks[0])["aboutMe"]["greeting"]
    assert home.text.index(SNAPSHOT_ID) < home.text.index(BOOTSTRAP_ELEMENT_ID)


# --- Head tags and JSON-LD -------------------------------------------------------


def test_canonical_social_cards_and_alternates(home):
    page = parse(home.text)
    canonical = [lk for lk in page.links if lk.get("rel") == "canonical"]
    assert [c["href"] for c in canonical] == ["https://www.jckail.com/"]
    assert meta(page, property="og:url")["content"] == "https://www.jckail.com/"
    image = "https://www.jckail.com/images/og-image.png"
    assert meta(page, property="og:image")["content"] == image
    assert meta(page, name="twitter:image")["content"] == image
    assert meta(page, property="og:image:width")["content"] == "1200"
    assert meta(page, name="twitter:card")["content"] == "summary_large_image"
    alternates = {lk["type"]: lk["href"] for lk in page.links if lk.get("rel") == "alternate"}
    assert alternates == {
        "text/plain": "https://www.jckail.com/llms.txt",
        "application/json": "https://www.jckail.com/resume.json",
        "application/pdf": "https://www.jckail.com/api/resume",
    }


def test_json_ld_parses_and_describes_the_person(home):
    blocks = [text for attrs, text in parse(home.text).scripts if attrs.get("type") == "application/ld+json"]
    assert len(blocks) == 1
    assert "<" not in blocks[0]
    graph = json.loads(blocks[0])["@graph"]
    by_type = {node["@type"]: node for node in graph}
    assert set(by_type) == {"WebSite", "ProfilePage", "Person"}
    person = by_type["Person"]
    assert person["jobTitle"] == "Staff Software Engineer"
    assert person["worksFor"]["name"] == "Together AI"
    assert "https://github.com/jckail" in person["sameAs"]
    assert {"Python", "Go", "SQL"} <= set(person["knowsAbout"])
    assert len(person["knowsAbout"]) == len({k.lower() for k in person["knowsAbout"]})
    assert "telephone" not in person and not PHONE_LIKE.search(json.dumps(person))
    assert by_type["ProfilePage"]["mainEntity"] == {"@id": person["@id"]}
    assert by_type["WebSite"]["url"] == "https://www.jckail.com/"


# --- Static files ----------------------------------------------------------------


def test_robots_allows_the_major_crawlers_and_lists_the_sitemap():
    with open(os.path.join(PUBLIC, "robots.txt"), encoding="utf-8") as f:
        text = f.read()
    groups = [g for g in re.split(r"\n\s*\n", text) if "User-agent" in g]
    named = next(g for g in groups if "GPTBot" in g)
    for agent in CRAWLERS:
        assert f"User-agent: {agent}" in named
    assert "Allow: /" in named and "Disallow: /admin" in named
    assert "Sitemap: https://www.jckail.com/sitemap.xml" in text
    assert not os.path.exists(os.path.join(PUBLIC, "sitemap.xml")), "sitemap.xml is generated"


def test_share_image_is_a_1200x630_png_under_100kb():
    path = os.path.join(PUBLIC, "images", "og-image.png")
    with open(path, "rb") as f:
        head = f.read(24)
    assert head[:8] == b"\x89PNG\r\n\x1a\n"
    assert (int.from_bytes(head[16:20], "big"), int.from_bytes(head[20:24], "big")) == (1200, 630)
    assert os.path.getsize(path) < 100_000
