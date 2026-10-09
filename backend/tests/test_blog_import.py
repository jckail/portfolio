"""The optional Substack import reads only bounded local RSS and creates drafts."""
import json
from xml.sax.saxutils import escape

import pytest

from helpers.import_substack import plain, plan


def fixture_feed(tmp_path, link="https://writing.example/p/one", body="A paragraph"):
    (tmp_path / "posts.json").write_text("[]")
    feed = tmp_path / "feed.xml"
    feed.write_text(f'<rss><channel><item><title>An article</title><link>{escape(link)}</link><pubDate>Thu, 08 Oct 2026 10:00:00 +0000</pubDate><description>{escape(body)}</description></item></channel></rss>')
    return feed


def test_import_is_draft_and_preserves_source(tmp_path):
    feed = fixture_feed(tmp_path)
    result = plan(feed, tmp_path, "https://writing.example")
    metadata, body = result[0]
    assert metadata["draft"] is True
    assert metadata["source_url"] == "https://writing.example/p/one"
    assert metadata["published"] == "2026-10-08"
    assert body == "A paragraph\n"
    assert not (tmp_path / "one.md").exists()
    (tmp_path / "posts.json").write_text(json.dumps([metadata]))
    assert plan(feed, tmp_path, "https://writing.example") == []


def test_import_rejects_other_publication_and_existing_files(tmp_path):
    feed = fixture_feed(tmp_path)
    with pytest.raises(ValueError, match="publication"):
        plan(feed, tmp_path, "https://other.example")
    (tmp_path / "one.md").write_text("Owner-authored text")
    with pytest.raises(ValueError, match="already exists"):
        plan(feed, tmp_path, "https://writing.example")
    assert (tmp_path / "one.md").read_text() == "Owner-authored text"


def test_import_rejects_entities_and_oversized_inputs(tmp_path):
    feed = fixture_feed(tmp_path)
    feed.write_text('<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]><rss/>')
    with pytest.raises(ValueError, match="entities"):
        plan(feed, tmp_path, "https://writing.example")
    feed.write_bytes(b"x" * 2_000_001)
    with pytest.raises(ValueError, match="2 MB"):
        plan(feed, tmp_path, "https://writing.example")


def test_import_plain_text_drops_scripts_and_tracking_markup():
    result = plain('<p>Keep this</p><script>discard</script><style>also discard</style><img src="tracking"><p>Second paragraph</p>')
    assert result == "Keep this\n\nSecond paragraph"


def test_long_slug_truncation_remains_valid(tmp_path):
    slug = "a" * 99 + "-more"
    feed = fixture_feed(tmp_path, link=f"https://writing.example/p/{slug}")
    assert plan(feed, tmp_path, "https://writing.example")[0][0]["slug"] == "a" * 99
