"""Searchable lab document generated from the project's public content."""

import json
import re
from html import escape

from .api.content import script_safe
from .api.discovery import CANONICAL_ORIGIN, SNAPSHOT_ID
from .models.data_loader import load_projects

LAB_PATHS = frozenset({"/dataplayground", "/dataplayground/"})
LAB_URL = f"{CANONICAL_ORIGIN}/dataplayground"


def render_document(html: bytes) -> bytes:
    """Replace home metadata and add an escaped no-JavaScript lab introduction."""
    from .spa import inject_jsonld, inject_root_content

    project = load_projects().root["data_playground"]
    name = project.title.strip()
    title = f"{name} | Jordan Kail"
    description = project.description
    text = html.decode("utf-8")

    def replace(pattern: str, replacement: str) -> None:
        nonlocal text
        text, count = re.subn(pattern, lambda _: replacement, text, flags=re.I | re.S)
        if not count:
            text = text.replace("</head>", replacement + "\n</head>", 1)

    replace(r"<title>.*?</title>", f"<title>{escape(title)}</title>")
    metadata = {
        "description": description,
        "og:title": title,
        "og:description": description,
        "og:url": LAB_URL,
        "og:type": "website",
        "twitter:title": title,
        "twitter:description": description,
        "twitter:url": LAB_URL,
    }
    for key, value in metadata.items():
        attr = "property" if key.startswith("og:") else "name"
        pattern = rf'<meta\b(?=[^>]*(?:name|property)=["\']{re.escape(key)}["\'])[^>]*>'
        replace(pattern, f'<meta {attr}="{key}" content="{escape(value, quote=True)}" />')
    replace(r'<link\b(?=[^>]*rel=["\']canonical["\'])[^>]*>', f'<link rel="canonical" href="{LAB_URL}" />')
    # Profile-only metadata and resume alternate representations belong to home.
    text = re.sub(r'<meta\b(?=[^>]*property=["\']profile:[^"\']*["\'])[^>]*>', "", text)
    text = re.sub(r'<link\b(?=[^>]*rel=["\']alternate["\'])[^>]*>', "", text)
    graph = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "@id": f"{LAB_URL}#application",
        "url": LAB_URL,
        "name": name,
        "description": description,
        "applicationCategory": "EducationalApplication",
        "operatingSystem": "Web browser",
        "isAccessibleForFree": True,
        "isPartOf": {"@id": f"{CANONICAL_ORIGIN}/#website"},
    }
    body = inject_jsonld(text.encode("utf-8"), script_safe(json.dumps(graph).encode("utf-8")))
    source_link = (
        f'<a href="{escape(str(project.link), quote=True)}">Source and reproduction instructions</a> · '
        if project.link else ""
    )
    snapshot = (
        f'<main id="{SNAPSHOT_ID}" class="{SNAPSHOT_ID}">'
        f"<h1>{escape(name)}</h1><p>{escape(description)}</p>"
        f"<p>{escape(project.description_detail)}</p>"
        "<p>All data is synthetic. Enable JavaScript to compare reproducible scenarios, "
        "inspect quality checks, and trace metrics to events and SQL.</p>"
        f'<p>{source_link}<a href="/">Back to portfolio</a></p></main>'
    )
    return inject_root_content(body, snapshot.encode("utf-8"))
