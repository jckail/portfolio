"""Server-rendered document for a hosted lab (``/<slug>``).

Written in the style of ``dataplayground_document.py`` but driven by one
``Lab`` record: metadata, canonical URL, JSON-LD (WebApplication and
BreadcrumbList) and an escaped no-JavaScript introduction inside ``#root``.
React replaces the fragment on mount, so it only serves readers that never
run the app.
"""
from __future__ import annotations

import json
import re
from html import escape

from .api.content import script_safe
from .api.discovery import CANONICAL_ORIGIN, SNAPSHOT_ID
from .models.labs import Lab


def lab_url(slug: str) -> str:
    return f"{CANONICAL_ORIGIN}/{slug}"


def page_title(lab: Lab) -> str:
    return f"{lab.title} | Jordan Kail"


def jsonld_graph(lab: Lab) -> dict:
    url = lab_url(lab.slug)
    return {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebApplication",
                "@id": f"{url}#application",
                "url": url,
                "name": lab.title,
                "description": lab.description,
                "applicationCategory": "DeveloperApplication",
                "operatingSystem": "Web browser",
                "isAccessibleForFree": True,
                "isPartOf": {"@id": f"{CANONICAL_ORIGIN}/#website"},
                "sameAs": [lab.repo],
                "dateModified": lab.updated,
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Jordan Kail", "item": f"{CANONICAL_ORIGIN}/"},
                    {"@type": "ListItem", "position": 2, "name": lab.title, "item": url},
                ],
            },
        ],
    }


def snapshot_fragment(lab: Lab) -> str:
    intro = "".join(f"<p>{escape(p)}</p>" for p in lab.intro)
    features = "".join(f"<li>{escape(f)}</li>" for f in lab.features)
    return (
        f'<main id="{SNAPSHOT_ID}" class="{SNAPSHOT_ID}">'
        f"<h1>{escape(lab.title)}</h1>{intro}"
        f"<h2>Features</h2><ul>{features}</ul>"
        f"<p><strong>{escape(lab.demo_notice)}</strong></p>"
        f'<p><a href="{escape(lab.repo, quote=True)}" tabindex="-1" rel="noopener">Source code on GitHub</a>'
        ' · <a href="/" tabindex="-1">Back to portfolio</a></p></main>'
    )


def render_lab_document(html: bytes, lab: Lab) -> bytes:
    """Replace home metadata with the lab's and add its escaped introduction."""
    from .spa import inject_jsonld, inject_root_content

    url = lab_url(lab.slug)
    title = page_title(lab)
    text = html.decode("utf-8")

    def replace(pattern: str, replacement: str) -> None:
        nonlocal text
        text, count = re.subn(pattern, lambda _: replacement, text, flags=re.I | re.S)
        if not count:
            text = text.replace("</head>", replacement + "\n</head>", 1)

    replace(r"<title>.*?</title>", f"<title>{escape(title)}</title>")
    metadata = {
        "description": lab.description,
        "og:title": title,
        "og:description": lab.description,
        "og:url": url,
        "og:type": "website",
        "twitter:title": title,
        "twitter:description": lab.description,
        "twitter:url": url,
    }
    for key, value in metadata.items():
        attr = "property" if key.startswith("og:") else "name"
        pattern = rf'<meta\b(?=[^>]*(?:name|property)=["\']{re.escape(key)}["\'])[^>]*>'
        replace(pattern, f'<meta {attr}="{key}" content="{escape(value, quote=True)}" />')
    replace(r'<link\b(?=[^>]*rel=["\']canonical["\'])[^>]*>', f'<link rel="canonical" href="{url}" />')
    text = re.sub(r'<meta\b(?=[^>]*property=["\']profile:[^"\']*["\'])[^>]*>', "", text)
    text = re.sub(r'<link\b(?=[^>]*rel=["\']alternate["\'])[^>]*>', "", text)
    body = inject_jsonld(text.encode("utf-8"), script_safe(json.dumps(jsonld_graph(lab)).encode("utf-8")))
    return inject_root_content(body, snapshot_fragment(lab).encode("utf-8"))
