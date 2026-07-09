"""JSON log formatter for Cloud Logging-friendly stdout."""
from __future__ import annotations

import json
import logging
from datetime import UTC, datetime

from .request_context import get_request_id


class JsonFormatter(logging.Formatter):
    """Emit one JSON object per log line with optional request_id."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict = {
            "timestamp": datetime.fromtimestamp(
                record.created, tz=UTC
            ).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "filename": record.filename,
            "funcName": record.funcName,
            "lineno": record.lineno,
        }
        request_id = get_request_id()
        if request_id:
            payload["request_id"] = request_id
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)
