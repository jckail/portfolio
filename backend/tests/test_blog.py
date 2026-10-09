"""Public writing excludes drafts and renders authored content without HTML execution."""
import json
from datetime import date
from xml.etree import ElementTree

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

from backend.app import blog
from backend.app.api import discovery
from backend.app.api.blog_routes import _payload, router


@pytest.fixture
def writing(tmp_path, monkeypatch):
    entries = [
        {"slug": "published", "title": "A public article", "description": "Public summary", "published": "2026-01-01", "draft": False},
        {"slug": "private-draft", "title": "Private draft", "description": "Do not expose", "published": "2026-01-01", "draft": True},
        {"slug": "future", "title": "Future article", "description": "Not yet", "published": "2027-01-01", "draft": False},
    ]
    (tmp_path / "posts.json").write_text(json.dumps(entries))
    for p in entries:
        (tmp_path / f"{p['slug']}.md").write_text("# A heading\n\nA **bold** explanation and `code`.\n\n- One\n- Two\n\n```python\nprint('<script>')\n```\n")
    monkeypatch.setattr(blog, "CONTENT", tmp_path)
    monkeypatch.setattr(blog, "publication_day", lambda: date(2026, 10, 8))
    blog.manifest.cache_clear()
    _payload.cache_clear()
    app = FastAPI()
    app.include_router(router)
    yield TestClient(app), tmp_path
    blog.manifest.cache_clear()
    _payload.cache_clear()


def test_index_feed_and_sitemap_exclude_unpublished(writing):
    client, _ = writing
    index = client.get("/blog")
    assert index.status_code == 200
    assert "A public article" in index.text
    assert "Private draft" not in index.text and "Future article" not in index.text
    feed = client.get("/blog/feed.xml")
    assert feed.headers["content-type"].startswith("application/rss+xml")
    assert len(ElementTree.fromstring(feed.content).findall("channel/item")) == 1
    sitemap = discovery.sitemap_xml().decode()
    assert "/blog/published" in sitemap
    assert "private-draft" not in sitemap and "/blog/future" not in sitemap
    for slug in ("private-draft", "future", "missing", "posts.json"):
        assert client.get(f"/blog/{slug}").status_code == 404


def test_article_metadata_rendering_head_and_cache(writing):
    client, _ = writing
    response = client.get("/blog/published")
    assert response.status_code == 200
    assert '<link rel="canonical" href="https://www.jckail.com/blog/published">' in response.text
    assert '"@type": "BlogPosting"' in response.text
    assert '<h2>A heading</h2>' in response.text
    assert '<strong>bold</strong>' in response.text
    assert "&lt;script&gt;" in response.text
    assert client.head("/blog/published").content == b""
    assert client.get("/blog/published", headers={"If-None-Match": response.headers["etag"]}).status_code == 304
    assert client.get("/blog/", follow_redirects=False).headers["location"] == "/blog"
    assert client.get("/blog/?theme=light", follow_redirects=False).headers["location"] == "/blog?theme=light"


def test_future_post_becomes_visible_without_process_restart(writing, monkeypatch):
    client, _ = writing
    assert "Future article" not in client.get("/blog").text
    monkeypatch.setattr(blog, "publication_day", lambda: date(2027, 1, 1))
    assert "Future article" in client.get("/blog").text
    assert client.get("/blog/future").status_code == 200
    assert "/blog/future" in discovery.sitemap_xml().decode()


def test_empty_state_contains_no_sample_post(writing):
    client, directory = writing
    (directory / "posts.json").write_text("[]")
    blog.manifest.cache_clear()
    assert "No posts published yet" in client.get("/blog").text
    assert ElementTree.fromstring(client.get("/blog/feed.xml").content).findall("channel/item") == []


def test_imported_article_uses_original_canonical(writing):
    client, directory = writing
    entries = json.loads((directory / "posts.json").read_text())
    entries[0]["source_url"] = "https://writing.example/p/original"
    (directory / "posts.json").write_text(json.dumps(entries))
    blog.manifest.cache_clear()
    response = client.get("/blog/published")
    assert '<link rel="canonical" href="https://writing.example/p/original">' in response.text
    assert response.headers["link"] == '<https://writing.example/p/original>; rel="canonical"'
    assert "Originally published" in response.text
    assert "/blog/published" not in discovery.sitemap_xml().decode()


def test_markdown_rejects_html_and_executable_links():
    result = blog.markdown('<img src=x onerror=alert(1)>\n\n[bad](javascript:alert) [good](https://example.com)\n\n```\n<script>\n')
    assert "<img" not in result and '<a href="javascript:' not in result
    assert '&lt;img' in result
    assert '<a href="https://example.com">good</a>' in result
    assert "&lt;script&gt;" in result
    assert blog.markdown("- a\n```\nx\n```\n- b").count("</ul>") == 2
    assert blog.inline("[local](/blog) [anchor](#one)").count("<a ") == 2


def test_metadata_rejects_path_traversal_and_invalid_source():
    base = {"slug": "valid", "title": "Title", "description": "Description", "published": "2026-01-01"}
    with pytest.raises(ValidationError):
        blog.Post(**{**base, "slug": "../secret"})
    with pytest.raises(ValidationError):
        blog.Post(**base, source_url="javascript:alert")


def test_duplicate_slugs_fail_validation(writing):
    _, directory = writing
    entries = json.loads((directory / "posts.json").read_text())
    (directory / "posts.json").write_text(json.dumps(entries + [entries[0]]))
    blog.manifest.cache_clear()
    with pytest.raises(ValueError, match="unique"):
        blog.posts()
