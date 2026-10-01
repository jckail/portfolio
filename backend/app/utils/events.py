"""Structured business events for Cloud Logging log-based metrics.

``log_event("contact.sent")`` writes one JSON line whose ``event`` field (and
any extra fields) land in ``jsonPayload``, so a Terraform log-based metric can
filter on ``jsonPayload.event`` and extract labels such as ``limiter``.

Event names are a closed contract (see ``KNOWN_EVENTS``); the fields are
sanitised here as a last line of defence: nothing that looks like an email,
address, message body or secret is ever written, whatever a caller passes.
"""
from __future__ import annotations

import logging
import re

from . import metrics

logger = logging.getLogger("backend.app.events")

KNOWN_EVENTS = frozenset({
    "auth.login_failed",
    "auth.login_succeeded",
    "rate_limit.blocked",
    "ws.rejected_origin",
    "chat.session_open",
    "chat.message",
    "chat.tool_call",
    "chat.confirm_requested",
    "chat.confirm_accepted",
    "chat.confirm_cancelled",
    "chat.provider_error",
    "chat.circuit_open",
    "chat.budget_exhausted",
    "contact.sent",
    "contact.failed",
    "phone.requested",
    "phone.revealed",
    "phone.failed",
    "event.received",
})

# Field names that must never be logged, matched as substrings (lowercased).
_FORBIDDEN_FIELD_PARTS = (
    "email", "mail", "phone", "ip", "addr", "message", "body", "text", "content",
    "token", "key", "secret", "password", "auth", "cookie", "subject", "query",
)
# Names that contain a forbidden part but are safe, structured values.
_ALLOWED_FIELDS = frozenset({"len_bucket", "limiter", "kind", "tool", "name", "reason", "status", "section"})

_MAX_VALUE_CHARS = 100
_SAFE_VALUE = re.compile(r"[^\w .:/@+-]")
_EMAIL_LIKE = re.compile(r"[^@\s]+@[^@\s]+")


def _clean_value(value):
    if isinstance(value, bool | int | float) or value is None:
        return value
    text = str(value)
    if _EMAIL_LIKE.search(text):
        return "[redacted]"
    return _SAFE_VALUE.sub("", text)[:_MAX_VALUE_CHARS]


def sanitize_fields(fields: dict) -> dict:
    clean = {}
    for key, value in fields.items():
        lowered = key.lower()
        if key not in _ALLOWED_FIELDS and any(part in lowered for part in _FORBIDDEN_FIELD_PARTS):
            continue
        clean[key] = _clean_value(value)
    return clean


def log_event(event: str, **fields) -> None:
    """Emit one structured event line and bump the process-local counter."""
    clean = sanitize_fields(fields)
    metrics.count_event(event, clean.get("limiter") if event == "rate_limit.blocked" else None)
    logger.info(event, extra={"event": event, "event_fields": clean})
