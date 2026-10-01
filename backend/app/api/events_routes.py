"""First-party product events: ``POST /api/events``.

Anonymous, cookie-free and sent by the browser only after the visitor accepts
analytics. The body is ``{"event": <name>, "props": {...}}``. The name must be
in ``EVENT_NAMES`` (kept in step with ``frontend/src/shared/analytics/events.ts``)
and props are an allowlist: unknown keys, free text and values that do not match
the portfolio data are dropped, never stored or logged. The handler only emits
the structured ``event.received`` log line, which Cloud Logging turns into a
metric; nothing is written to a database.
"""
from __future__ import annotations

import re
from functools import cache
from typing import Any

from fastapi import APIRouter, HTTPException, Request, Response

from ..models.data_loader import load_experience, load_projects, load_skills
from ..utils.events import log_event
from ..utils.rate_limit import SlidingWindowLimiter, enforce_rate_limit
from .telemetry_routes import _read_json_capped

router = APIRouter()

EVENT_NAMES = frozenset({
    "section_view", "deep_link_open", "modal_open", "modal_close", "outbound_click",
    "resume_preview", "resume_download", "contact_open", "phone_reveal_requested",
    "chat_open", "chat_message_sent", "chat_action_confirmed", "chat_action_cancelled",
    "theme_change", "party_mode", "search_used", "scroll_depth", "web_vital", "client_error",
})

MAX_EVENT_BYTES = 4 * 1024
MAX_PROPS = 16

SECTIONS = frozenset({"about", "experience", "projects", "skills", "resume", "doodle"})
THEMES = frozenset({"light", "dark", "party"})
KINDS = frozenset({"experience", "project", "skill", "contact", "palette", "chat", "other"})
PARAMS = frozenset({"skill", "project", "company", "ai_chat", "party", "theme", "hash"})
LENGTHS = frozenset({"0", "1-10", "11-50", "51-200", "201+"})
DEPTHS = frozenset({"25", "50", "75", "100"})
METRICS = frozenset({"LCP", "CLS", "INP"})
RATINGS = frozenset({"good", "needs-improvement", "poor"})
SLUG = re.compile(r"^[a-z0-9][a-z0-9_-]{0,39}$")

# Generous for a human on one page (the SPA caps itself at 200 per load), tight
# enough that a loop cannot turn this into a log-volume amplifier.
_events_limiter = SlidingWindowLimiter(max_events=120, window_seconds=60, global_max_events=3000, name="events")


def _slug_forms(value: str) -> set[str]:
    base = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")[:40].rstrip("-")
    return {base, base.replace("-", "_")}


@cache
def _known_slugs() -> dict[str, frozenset[str]]:
    """Valid project/skill/company slugs: JSON keys and slugified display names."""
    def collect(items: dict[str, Any], label: str) -> frozenset[str]:
        out: set[str] = set()
        for key, item in items.items():
            out |= _slug_forms(key) | {key.lower()}
            out |= _slug_forms(getattr(item, label, "") or "")
        return frozenset(s for s in out if SLUG.match(s))

    return {
        "project": collect(load_projects().root, "title"),
        "skill": collect(load_skills().root, "display_name"),
        "company": collect(load_experience().root, "company"),
    }


def _enum(allowed: frozenset[str]):
    return lambda value: value if isinstance(value, str) and value in allowed else None


def _known(kind: str):
    return lambda value: value if isinstance(value, str) and value in _known_slugs()[kind] else None


# Only low-cardinality, validated props are kept (and logged). Free text such
# as client error messages is dropped on purpose.
_PROP_VALIDATORS = {
    "section": _enum(SECTIONS),
    "theme": _enum(THEMES),
    "from": _enum(THEMES),
    "kind": _enum(KINDS),
    "param": _enum(PARAMS),
    "len": _enum(LENGTHS),
    "depth": _enum(DEPTHS),
    "metric": _enum(METRICS),
    "rating": _enum(RATINGS),
    "project": _known("project"),
    "skill": _known("skill"),
    "company": _known("company"),
}


def validate_props(props: Any) -> dict[str, str]:
    if not isinstance(props, dict):
        return {}
    clean: dict[str, str] = {}
    for key in list(props)[:MAX_PROPS]:
        validator = _PROP_VALIDATORS.get(key) if isinstance(key, str) else None
        if validator is None:
            continue
        value = validator(props[key])
        if value is not None:
            clean[key] = value
    return clean


@router.post("/events", status_code=204)
async def receive_event(request: Request) -> Response:
    """Record one analytics event as a structured log line. Always 204 on success."""
    enforce_rate_limit(_events_limiter, request)
    body = await _read_json_capped(request, MAX_EVENT_BYTES)
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="Body must be a JSON object")
    name = body.get("event")
    if not isinstance(name, str) or name not in EVENT_NAMES:
        raise HTTPException(status_code=422, detail="Unknown event")
    props = validate_props(body.get("props"))
    # "name" is the event; the validated props ride along as bounded labels.
    props.pop("name", None)
    log_event("event.received", name=name, **props)
    return Response(status_code=204)
