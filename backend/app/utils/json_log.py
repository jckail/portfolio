"""JSON log formatter for Cloud Logging-friendly stdout.

Field names follow the Cloud Logging structured-logging contract: ``severity``,
``message``, ``logging.googleapis.com/trace`` / ``spanId`` for request
correlation, and (for ERROR and above) ``serviceContext`` plus a stack trace in
``message`` so Error Reporting groups the occurrence.
"""
from __future__ import annotations

import json
import logging
from datetime import UTC, datetime

from ..config import get_settings
from .request_context import get_request_id, get_trace

REPORTED_ERROR_TYPE = "type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent"


class JsonFormatter(logging.Formatter):
    """Emit one JSON object per log line with trace, request_id and event fields."""

    def format(self, record: logging.LogRecord) -> str:
        settings = get_settings()
        message = record.getMessage()
        payload: dict = {
            "timestamp": datetime.fromtimestamp(
                record.created, tz=UTC
            ).isoformat(),
            # Cloud Logging only maps `severity`; `level` is kept for jq users.
            "severity": record.levelname,
            "level": record.levelname,
            "logger": record.name,
            "message": message,
            "filename": record.filename,
            "funcName": record.funcName,
            "lineno": record.lineno,
        }
        # Prefer the id stamped at emit time (see SupabaseHandler.emit).
        request_id = getattr(record, "request_id", None) or get_request_id()
        if request_id:
            payload["request_id"] = request_id

        trace = getattr(record, "trace", None) or get_trace()
        if trace:
            trace_id, span_id, sampled = trace
            payload["logging.googleapis.com/trace"] = f"projects/{settings.gcp_project_id}/traces/{trace_id}"
            if span_id:
                payload["logging.googleapis.com/spanId"] = span_id
            payload["logging.googleapis.com/trace_sampled"] = sampled

        event = getattr(record, "event", None)
        if event:
            payload["event"] = event
            fields = getattr(record, "event_fields", None) or {}
            for key, value in fields.items():
                # Never let a field overwrite a structural key.
                payload.setdefault(key, value)

        # Structured extras for the access log.
        http_request = getattr(record, "http_request", None)
        if http_request:
            payload["httpRequest"] = http_request

        if record.exc_info:
            stack = self.formatException(record.exc_info)
            payload["exception"] = stack
            payload["stack_trace"] = stack
            if record.levelno >= logging.ERROR:
                # Error Reporting reads the trace from `message` and needs the
                # service identity to group occurrences.
                payload["message"] = f"{message}\n{stack}"
                payload["@type"] = REPORTED_ERROR_TYPE
        if record.levelno >= logging.ERROR:
            payload["serviceContext"] = {
                "service": settings.service_name,
                "version": settings.git_commit or "unknown",
            }
        return json.dumps(payload, default=str)
