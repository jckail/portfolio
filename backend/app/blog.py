"""Repository-authored writing; no remote fetch, raw HTML or public drafts."""
from __future__ import annotations

import json
import re
from datetime import UTC, date, datetime
from functools import cache
from html import escape
from pathlib import Path
from urllib.parse import urlsplit
from xml.etree.ElementTree import Element, SubElement, tostring

from pydantic import BaseModel, ConfigDict, Field, field_validator

ORIGIN = "https://www.jckail.com"
CONTENT = Path(__file__).parent / "data" / "blog"


class Post(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=100)
    title: str = Field(min_length=1, max_length=180)
    description: str = Field(min_length=1, max_length=320)
    published: date
    draft: bool = True
    source_url: str | None = None

    @field_validator("source_url")
    @classmethod
    def validate_source(cls, value: str | None) -> str | None:
        if value is not None and (urlsplit(value).scheme != "https" or not urlsplit(value).netloc):
            raise ValueError("A source must be an absolute HTTPS URL")
        return value


@cache
def manifest() -> tuple[Post, ...]:
    entries = tuple(Post.model_validate(p) for p in json.loads((CONTENT / "posts.json").read_text()))
    if len({p.slug for p in entries}) != len(entries):
        raise ValueError("Blog slugs must be unique")
    return entries


def publication_day() -> date:
    return datetime.now(UTC).date()


def posts() -> tuple[Post, ...]:
    entries = manifest()
    today = publication_day()
    return tuple(sorted((p for p in entries if not p.draft and p.published <= today), key=lambda p: p.published, reverse=True))


def safe_link(value: str) -> bool:
    parsed = urlsplit(value)
    return (parsed.scheme in {"https", "http"} and bool(parsed.netloc)) or (value.startswith("/") and not value.startswith("//")) or value.startswith("#")


def inline(text: str) -> str:
    # Escape tokens individually so authored HTML can never become markup.
    output = []
    for token in re.split(r"(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^\s)]+\))", text):
        if token.startswith("`") and token.endswith("`"):
            output.append(f"<code>{escape(token[1:-1])}</code>")
        elif token.startswith("**") and token.endswith("**"):
            output.append(f"<strong>{escape(token[2:-2])}</strong>")
        elif (match := re.fullmatch(r"\[([^\]]+)\]\(([^\s)]+)\)", token)) and safe_link(match[2]):
            output.append(f'<a href="{escape(match[2], quote=True)}">{escape(match[1])}</a>')
        else:
            output.append(escape(token))
    return "".join(output)


def markdown(text: str) -> str:
    """Small documented Markdown subset; embedded HTML is always escaped."""
    output: list[str] = []
    paragraph: list[str] = []
    code: list[str] | None = None
    listing = False

    def flush() -> None:
        if paragraph:
            output.append(f"<p>{inline(' '.join(paragraph))}</p>")
            paragraph.clear()

    for line in text.splitlines():
        if line.startswith("```"):
            flush()
            if listing:
                output.append("</ul>")
                listing = False
            if code is None:
                code = []
            else:
                output.append("<pre><code>" + escape("\n".join(code)) + "</code></pre>")
                code = None
            continue
        if code is not None:
            code.append(line)
            continue
        if line.startswith("- "):
            flush()
            if not listing:
                output.append("<ul>")
                listing = True
            output.append(f"<li>{inline(line[2:])}</li>")
            continue
        if listing:
            output.append("</ul>")
            listing = False
        if match := re.fullmatch(r"(#{1,6}) (.+)", line):
            flush()
            level = min(len(match[1]) + 1, 6)
            output.append(f"<h{level}>{inline(match[2])}</h{level}>")
        elif not line.strip():
            flush()
        else:
            paragraph.append(line.strip())
    flush()
    if listing:
        output.append("</ul>")
    if code is not None:
        output.append("<pre><code>" + escape("\n".join(code)) + "</code></pre>")
    return "\n".join(output)


def document(post: Post | None = None) -> bytes:
    title = f"{post.title} | Jordan Kail" if post else "Writing | Jordan Kail"
    description = post.description if post else "Writing by Jordan Kail on AI agents, software engineering, and the systems behind them."
    path = f"/blog/{post.slug}" if post else "/blog"
    url = post.source_url if post and post.source_url else ORIGIN + path
    if post:
        body = markdown((CONTENT / f"{post.slug}.md").read_text())
        source = f'<p class="source">Originally published <a href="{escape(post.source_url, quote=True)}">on Substack</a>.</p>' if post.source_url else ""
        content = f'<a class="back" href="/blog">← All writing</a><article><header><p class="eyebrow">Jordan Kail · <time datetime="{post.published}">{post.published.strftime("%B %d, %Y")}</time></p><h1>{escape(post.title)}</h1><p class="lede">{escape(post.description)}</p>{source}</header><div class="prose">{body}</div></article>'
        schema = {"@type": "BlogPosting", "headline": post.title, "datePublished": str(post.published), "author": {"@type": "Person", "name": "Jordan Kail", "url": ORIGIN}, "mainEntityOfPage": url}
    else:
        cards = "".join(f'<article class="post-card"><time datetime="{p.published}">{p.published.strftime("%B %d, %Y")}</time><h2><a href="/blog/{p.slug}">{escape(p.title)}</a></h2><p>{escape(p.description)}</p><a href="/blog/{p.slug}">Read article <span aria-hidden="true">↗</span></a></article>' for p in posts())
        if not cards:
            cards = '<div class="empty"><span class="empty-mark" aria-hidden="true">✳</span><h2>The next chapter is taking shape.</h2><p>No posts published yet. In the meantime, explore the projects behind the work.</p><a class="button" href="/#projects">Explore projects ↗</a></div>'
        content = '<header class="intro"><p class="eyebrow">Notes from the workbench</p><h1>Writing</h1><p class="lede">AI agents, software engineering, and the systems behind them.</p><a class="rss" href="/blog/feed.xml">Follow via RSS ↗</a></header><section class="posts" aria-label="Articles">' + cards + '</section>'
        schema = {"@type": "Blog", "name": "Jordan Kail — Writing", "url": url}
    schema.update({"@context": "https://schema.org", "description": description})
    structured = json.dumps(schema).replace("<", "\\u003c")
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{escape(title)}</title><meta name="description" content="{escape(description, quote=True)}"><meta name="robots" content="index, follow"><link rel="canonical" href="{escape(url, quote=True)}"><link rel="alternate" type="application/rss+xml" title="Jordan Kail — Writing" href="{ORIGIN}/blog/feed.xml"><meta property="og:type" content="{"article" if post else "website"}"><meta property="og:title" content="{escape(title, quote=True)}"><meta property="og:description" content="{escape(description, quote=True)}"><meta property="og:url" content="{escape(url, quote=True)}"><meta name="twitter:card" content="summary"><link rel="icon" href="/favicon.ico"><link rel="stylesheet" href="/blog-assets/blog.css"><script src="/blog-assets/theme.js" defer></script><script type="application/ld+json">{structured}</script></head><body><a class="skip" href="#main">Skip to writing</a><div class="shell"><nav aria-label="Main navigation"><a class="wordmark" href="/">Jordan Kail<span>AI | Data | ML</span></a><div class="nav-actions"><a href="/#projects">Projects</a><button id="theme-toggle" type="button" aria-label="Switch color theme">◐</button></div></nav><main id="main">{content}</main><footer><a href="/">← Portfolio</a><a href="/blog/feed.xml">RSS</a><a href="/privacy/">Privacy</a><span>Jordan Kail</span></footer></div></body></html>'''.encode()


def feed() -> bytes:
    root = Element("rss", version="2.0")
    channel = SubElement(root, "channel")
    for tag, value in (("title", "Jordan Kail — Writing"), ("link", ORIGIN + "/blog"), ("description", "Writing on AI agents and software engineering."), ("language", "en-us")):
        SubElement(channel, tag).text = value
    for post in posts():
        item = SubElement(channel, "item")
        for tag, value in (("title", post.title), ("link", ORIGIN + "/blog/" + post.slug), ("guid", ORIGIN + "/blog/" + post.slug), ("description", post.description), ("pubDate", post.published.strftime("%a, %d %b %Y 00:00:00 +0000"))):
            SubElement(item, tag).text = value
    return tostring(root, encoding="utf-8", xml_declaration=True)
