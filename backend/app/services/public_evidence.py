"""Read-only retrieval over the existing curated public portfolio JSON.

No filesystem paths, URLs, database queries, contact data or browser history
are accepted from callers. All interfaces use this same bounded search.
"""
from urllib.parse import quote

from backend.app.models.public_evidence import EvidenceAnswer, EvidenceSource
from backend.app.services.chat_tools import search_portfolio

ORIGIN = "https://www.jckail.com"
_KINDS = {"experience": "company", "projects": "project", "skills": "skill"}


def evidence_answer(query: str) -> EvidenceAnswer:
    if not isinstance(query, str) or not query.strip() or len(query) > 200:
        raise ValueError("Use between 1 and 200 characters.")
    sources = []
    for item in search_portfolio(query).get("results", []):
        collection = item["source"]
        if collection not in (*_KINDS, "about_me"):
            continue
        key = item["key"]
        path = f"/?{_KINDS[collection]}={quote(key, safe='')}" if collection in _KINDS else "/#about"
        sources.append(EvidenceSource(
            id=f"{collection}:{key}", title=item["title"],
            url=ORIGIN + path, snippets=item["snippets"],
        ))
    answer = (
        "Here are matching passages from my public portfolio. Open the sources for context."
        if sources else
        "I couldn't find supporting public evidence for that question. Try specific project or technology keywords."
    )
    return EvidenceAnswer(answer=answer, sources=sources)
