"""Import an owner's downloaded RSS feed into reviewed, unpublished blog drafts.

No network access. Run without --write to preview. Existing files are never
overwritten; source URLs make repeated imports idempotent.
"""
from __future__ import annotations

import argparse
import json
import re
from datetime import UTC
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
from xml.etree import ElementTree

DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / "backend/app/data/blog"
MAX_BYTES = 2_000_000


class PlainText(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []
        self.hidden = 0

    def handle_starttag(self, tag: str, attrs: list) -> None:
        if tag in {"script", "style"}:
            self.hidden += 1
        if tag in {"p", "div", "br", "h1", "h2", "h3", "li", "blockquote", "pre"}:
            self.parts.append("\n\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style"} and self.hidden:
            self.hidden -= 1
        if tag in {"p", "div", "li", "blockquote", "pre"}:
            self.parts.append("\n\n")

    def handle_data(self, data: str) -> None:
        if not self.hidden:
            self.parts.append(data)

    def text(self) -> str:
        return re.sub(r"\n{3,}", "\n\n", "".join(self.parts)).strip()


def plain(value: str) -> str:
    parser = PlainText()
    parser.feed(value)
    return parser.text()


def plan(feed_path: Path, output: Path, publication: str) -> list[tuple[dict, str]]:
    origin = urlsplit(publication)
    if origin.scheme != "https" or not origin.netloc or origin.username or origin.password:
        raise ValueError("Publication must be an HTTPS URL without credentials")
    if feed_path.stat().st_size > MAX_BYTES:
        raise ValueError("Feed exceeds the 2 MB import limit")
    raw = feed_path.read_bytes()
    if re.search(br"<!\s*(?:DOCTYPE|ENTITY)", raw, re.I):
        raise ValueError("XML declarations with entities are not supported")
    root = ElementTree.fromstring(raw)
    if root.tag != "rss":
        raise ValueError("Expected an RSS feed")
    existing = json.loads((output / "posts.json").read_text())
    urls = {entry.get("source_url") for entry in existing}
    slugs = {entry["slug"] for entry in existing}
    result = []
    items = root.findall("channel/item")
    if len(items) > 100:
        raise ValueError("Import at most 100 posts at a time")
    for item in items:
        link = (item.findtext("link") or "").strip()
        source = urlsplit(link)
        if source.scheme != "https" or source.netloc != origin.netloc or source.username or source.password:
            raise ValueError("Every post must belong to the specified publication")
        if link in urls:
            continue
        title = plain(item.findtext("title") or "").strip()
        if not title or len(title) > 180:
            raise ValueError("Post title must have between 1 and 180 characters")
        slug = re.sub(r"[^a-z0-9]+", "-", source.path.rstrip("/").split("/")[-1].lower()).strip("-")[:100].rstrip("-")
        if not slug or slug in slugs or (output / f"{slug}.md").exists():
            raise ValueError("A post slug is empty or already exists; rename the source before importing")
        published = parsedate_to_datetime(item.findtext("pubDate") or "")
        published = published.replace(tzinfo=published.tzinfo or UTC).astimezone(UTC).date()
        raw_body = item.findtext("{http://purl.org/rss/1.0/modules/content/}encoded") or item.findtext("description") or ""
        body = plain(raw_body)
        if not body:
            raise ValueError("Post has no body")
        description = " ".join(plain(item.findtext("description") or raw_body).split())[:320]
        if not description:
            raise ValueError("Post has no description")
        result.append(({"slug": slug, "title": title, "description": description, "published": str(published), "draft": True, "source_url": link}, body + "\n"))
        urls.add(link)
        slugs.add(slug)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("feed", type=Path)
    parser.add_argument("--publication", required=True, help="Your publication's exact HTTPS origin")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    imports = plan(args.feed, args.output, args.publication)
    for metadata, _ in imports:
        print(f"Draft: {metadata['slug']}")
    if args.write and imports:
        manifest = args.output / "posts.json"
        entries = json.loads(manifest.read_text())
        for metadata, body in imports:
            with (args.output / f"{metadata['slug']}.md").open("x") as target:
                target.write(body)
            entries.append(metadata)
        temp = manifest.with_suffix(".json.tmp")
        temp.write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n")
        temp.replace(manifest)
    print(f"{len(imports)} drafts {'imported' if args.write else 'planned; pass --write to import'}. Review before publishing.")


if __name__ == "__main__":
    main()
