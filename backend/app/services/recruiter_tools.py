"""Bounded recruiter evidence tools over approved portfolio content only."""
from __future__ import annotations

from copy import deepcopy
from urllib.parse import urlencode

from backend.app.services.public_context import PUBLIC_URL, public_context

MAX_REQUIREMENTS = 8
MAX_REQUIREMENT_CHARS = 200


def get_recruiter_brief(focus: object = "") -> dict:
    """Return a small source-backed brief, not a hiring recommendation."""
    context = public_context()
    from backend.app.services.chat_tools import search_portfolio

    query = focus.strip()[:200] if isinstance(focus, str) else ""
    return {
        "profile": deepcopy(context["profile"]),
        "experience": [
            {**deepcopy(job), "highlights": job["highlights"][:2]}
            for job in context["experience"][:3]
        ],
        "relevant_evidence": search_portfolio(query)["results"] if query else [],
        "skill_groups": deepcopy(context["skillGroups"]),
        "sources": {**context["sources"], "pdf": f"{PUBLIC_URL}/api/resume"},
        "note": "Use only these published facts. Availability, compensation and confidential details are unknown.",
    }


def get_project_details(key: object) -> dict:
    """Resolve an exact public project key without fetching external URLs."""
    from backend.app.models.data_loader import load_projects

    if not isinstance(key, str) or len(key) > 64:
        return {"status": "not_found", "note": "Use a project key from search_portfolio."}
    project = load_projects().root.get(key)
    if project is None:
        return {"status": "not_found", "note": "That project is not published in the portfolio."}
    links = [{"label": project.link_label, "url": str(project.link)}]
    if project.link2:
        links.append({"label": project.link2_label, "url": str(project.link2)})
    return {
        "key": key, "title": project.title, "description": project.description,
        "details": project.description_detail[:6000], "technologies": project.tech_stack,
        "links": links, "source_url": f"{PUBLIC_URL}/?{urlencode({'project': key})}",
        "note": "Published project description, not an independent code audit or verified demo uptime.",
    }


def match_role_requirements(requirements: object) -> dict:
    """Map visitor-selected requirements to evidence; never invent a fit score."""
    from backend.app.services.chat_tools import search_portfolio

    if not isinstance(requirements, list) or not 1 <= len(requirements) <= MAX_REQUIREMENTS:
        return {"status": "invalid_arguments", "note": "Provide one to eight short technical requirements."}
    if any(not isinstance(item, str) or not item.strip() or len(item) > MAX_REQUIREMENT_CHARS
           for item in requirements):
        return {"status": "invalid_arguments", "note": "Each requirement must be one to 200 characters."}
    matches = []
    for requirement in requirements:
        # Search is deliberately lexical. A returned hit is evidence to inspect,
        # not proof that every word or proficiency level in a requirement is met.
        hits = search_portfolio(requirement)["results"][:3]
        matches.append({
            "requirement": requirement.strip(), "evidence": hits,
            "status": "evidence_to_review" if hits else "not_published",
        })
    return {
        "requirements": matches, "source_url": f"{PUBLIC_URL}/context.json",
        "note": (
            "Keyword evidence lookup, not a fit score or hiring decision. Explain which published facts "
            "support each requirement and identify partial matches and unknowns. Do not infer availability, "
            "work authorization, compensation or qualifications from missing evidence."
        ),
    }


def get_contact_options() -> dict:
    """Public links and confirmation instructions; no private contact data."""
    profile = public_context()["profile"]
    return {
        "contact_form": f"{PUBLIC_URL}/?contact=open", "linkedin": profile["linkedin"],
        "github": profile["github"], "resume": f"{PUBLIC_URL}/api/resume",
        "message": "contact_jordan drafts a message for visitor review; nothing is sent until Confirm succeeds.",
        "meeting": "request_meeting sends a request after confirmation; it does not book a calendar slot.",
        "email": "The visitor enters their reply email in the confirmation card, not in chat.",
        "note": "Do not claim a response time, current availability or a confirmed meeting.",
    }
