"""Per-request correlation ID via contextvars."""
from __future__ import annotations

import contextvars
import uuid

_request_id: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "request_id", default=None
)


def get_request_id() -> str | None:
    return _request_id.get()


def set_request_id(value: str | None = None) -> str:
    rid = value or uuid.uuid4().hex
    _request_id.set(rid)
    return rid


def clear_request_id() -> None:
    _request_id.set(None)
