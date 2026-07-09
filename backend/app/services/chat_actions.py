"""Client-executable actions the assistant can request.

The model emits these via Anthropic tool_use; the WebSocket layer forwards
them as `{type: "action", ...}` frames so the frontend can navigate the site.
"""
from __future__ import annotations

# Tools Claude may call. Keep schemas tight so the model can't invent targets.
CHAT_TOOLS: list[dict] = [
    {
        "name": "navigate_section",
        "description": (
            "Scroll the visitor to a portfolio section. Use when they ask to "
            "see experience, projects, skills, resume, about, or the doodle."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "section": {
                    "type": "string",
                    "enum": [
                        "about",
                        "experience",
                        "projects",
                        "skills",
                        "resume",
                        "doodle",
                    ],
                    "description": "Section id to scroll to",
                }
            },
            "required": ["section"],
        },
    },
    {
        "name": "open_modal",
        "description": (
            "Open a deep-linked modal for a company, skill, or project. "
            "Use company slugs like meta-facebook, skill keys like python, "
            "or project keys like super_teacher / jobbr."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "kind": {
                    "type": "string",
                    "enum": ["company", "skill", "project", "contact"],
                    "description": "Which modal family to open",
                },
                "key": {
                    "type": "string",
                    "description": (
                        "Slug/key for company/skill/project. Omit for contact."
                    ),
                },
            },
            "required": ["kind"],
        },
    },
    {
        "name": "download_resume",
        "description": "Trigger a download of Jordan's PDF resume for the visitor.",
        "input_schema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "prefill_contact",
        "description": (
            "Open the contact form and optionally prefill subject/message/"
            "visitor email when the visitor wants to reach Jordan. Draft a "
            "professional message from the conversation context."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "from_email": {
                    "type": "string",
                    "description": "Visitor email if they provided one",
                },
                "subject": {
                    "type": "string",
                    "description": "Suggested email subject",
                },
                "message": {
                    "type": "string",
                    "description": "Suggested message body the visitor can edit",
                },
            },
        },
    },
    {
        "name": "set_theme",
        "description": (
            "Switch the site theme. Use 'party' only for playful easter-egg "
            "requests; otherwise prefer light or dark."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "theme": {
                    "type": "string",
                    "enum": ["light", "dark", "party"],
                }
            },
            "required": ["theme"],
        },
    },
]

ALLOWED_SECTIONS = frozenset(
    {"about", "experience", "projects", "skills", "resume", "doodle"}
)
ALLOWED_MODAL_KINDS = frozenset({"company", "skill", "project", "contact"})
ALLOWED_THEMES = frozenset({"light", "dark", "party"})


def normalize_tool_action(name: str, raw_input: dict | None) -> dict | None:
    """Validate a tool_use block into a safe frontend action payload."""
    payload = raw_input if isinstance(raw_input, dict) else {}

    if name == "navigate_section":
        section = str(payload.get("section", "")).strip().lower()
        if section not in ALLOWED_SECTIONS:
            return None
        return {"action": "navigate", "target": section}

    if name == "open_modal":
        kind = str(payload.get("kind", "")).strip().lower()
        if kind not in ALLOWED_MODAL_KINDS:
            return None
        key = str(payload.get("key", "")).strip()
        if kind != "contact" and not key:
            return None
        # Bound key length to avoid absurd URL params
        if len(key) > 64:
            return None
        return {"action": "open_modal", "kind": kind, "key": key or None}

    if name == "download_resume":
        return {"action": "download_resume"}

    if name == "prefill_contact":
        draft: dict[str, str] = {}
        for field, limit in (("from_email", 200), ("subject", 200), ("message", 4000)):
            value = payload.get(field)
            if isinstance(value, str) and value.strip():
                draft[field] = value.strip()[:limit]
        return {"action": "prefill_contact", "draft": draft}

    if name == "set_theme":
        theme = str(payload.get("theme", "")).strip().lower()
        if theme not in ALLOWED_THEMES:
            return None
        return {"action": "set_theme", "theme": theme}

    return None
