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


# Cloud Trace correlation, parsed from X-Cloud-Trace-Context ("TRACE/SPAN;o=1").
_trace: contextvars.ContextVar[tuple[str, str | None, bool] | None] = contextvars.ContextVar(
    "trace_context", default=None
)


def parse_trace_header(value: str | None) -> tuple[str, str | None, bool] | None:
    """Return (trace_id, span_id, sampled) from the header, or None if malformed."""
    if not value:
        return None
    head, _, options = value.partition(";")
    trace_id, _, span_id = head.partition("/")
    if len(trace_id) != 32 or not all(c in "0123456789abcdefABCDEF" for c in trace_id):
        return None
    # Cloud Run sends the span as a decimal number; Cloud Logging wants it as
    # 16 hex digits.
    span_hex: str | None = None
    if span_id.isdigit() and len(span_id) <= 20:
        number = int(span_id)
        if number < 1 << 64:
            span_hex = f"{number:016x}"
    return trace_id.lower(), span_hex, "o=1" in options


def set_trace(header: str | None) -> None:
    _trace.set(parse_trace_header(header))


def get_trace() -> tuple[str, str | None, bool] | None:
    return _trace.get()


def clear_trace() -> None:
    _trace.set(None)
