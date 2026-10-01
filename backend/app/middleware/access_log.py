"""Trace correlation, one structured access-log line per request, error logging.

Plain ASGI (not BaseHTTPMiddleware) so response bodies are not re-streamed.
It is the outermost middleware: the trace context set here is visible to every
log line the request produces, and an exception that escapes the app is logged
at ERROR with its stack trace (so Error Reporting sees it) before Starlette's
own handler turns it into a 500.

Nothing request-identifying beyond the route template is logged: no query
string, no client address, no headers, no bodies.
"""
from __future__ import annotations

import logging
import time

from starlette.datastructures import Headers
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from ..config import Settings
from ..utils import metrics
from ..utils.request_context import clear_trace, get_trace, set_trace

logger = logging.getLogger("backend.app.access")

# Probes and static assets would drown the signal and, for health checks,
# cost money in log volume.
SKIP_PREFIXES = ("/api/health", "/assets/", "/fonts/", "/images/", "/api/assets/")
STATIC_SUFFIXES = (
    ".js", ".css", ".map", ".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico", ".woff", ".woff2", ".gif", ".avif",
)


def should_log(path: str) -> bool:
    if path.startswith(SKIP_PREFIXES):
        return False
    return not (not path.startswith("/api/") and path.lower().endswith(STATIC_SUFFIXES))


def route_template(scope: Scope) -> str:
    """The matched route as a path template, never the raw path (bounded cardinality).

    Recent FastAPI keeps included routers lazy, so ``route.path`` is relative to
    its router (``/login``, not ``/api/admin/login``). The full template is
    rebuilt from the raw path by swapping each path parameter back to its name.
    """
    path: str = scope.get("path", "")
    if scope.get("route") is None:
        return "unmatched" if path.startswith("/api/") else "static"
    template = path
    for name, value in (scope.get("path_params") or {}).items():
        segment = f"/{value}"
        index = template.rfind(segment)
        if index >= 0:
            template = f"{template[:index]}/{{{name}}}{template[index + len(segment):]}"
    return template


class AccessLogMiddleware:
    def __init__(self, app: ASGIApp, settings: Settings) -> None:
        self.app = app
        self.enabled = settings.access_log_enabled

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        set_trace(Headers(scope=scope).get("x-cloud-trace-context"))
        if scope["type"] == "websocket":
            try:
                await self.app(scope, receive, send)
            finally:
                clear_trace()
            return

        started = time.perf_counter()
        status = 500
        sent_bytes = 0

        async def send_wrapper(message: Message) -> None:
            nonlocal status, sent_bytes
            if message["type"] == "http.response.start":
                status = message["status"]
            elif message["type"] == "http.response.body":
                sent_bytes += len(message.get("body", b""))
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception:
            logger.error("Unhandled exception in request handler", exc_info=True,
                         extra={"request_id": scope.get("state", {}).get("request_id")})
            raise
        finally:
            path = scope.get("path", "")
            if should_log(path):
                metrics.count_status(status)
                if self.enabled:
                    self._log(scope, status, sent_bytes, (time.perf_counter() - started) * 1000)
            clear_trace()

    @staticmethod
    def _log(scope: Scope, status: int, sent_bytes: int, latency_ms: float) -> None:
        method = scope.get("method", "")
        route = route_template(scope)
        level = logging.ERROR if status >= 500 else logging.WARNING if status == 429 else logging.INFO
        logger.log(
            level,
            "%s %s %s",
            method, route, status,
            extra={
                "request_id": scope.get("state", {}).get("request_id"),
                "trace": get_trace(),
                "http_request": {
                    "requestMethod": method,
                    "status": status,
                    "responseSize": str(sent_bytes),
                    "latency": f"{latency_ms / 1000:.6f}s",
                },
                "event_fields": {"route": route, "latency_ms": round(latency_ms, 1), "bytes": sent_bytes},
                "event": "http.request",
            },
        )
