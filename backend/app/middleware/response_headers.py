"""Request IDs, cache policy and security headers for every HTTP response.

A plain ASGI middleware rather than ``@app.middleware("http")``: Starlette's
BaseHTTPMiddleware runs the app in a separate task and re-streams every body
through a memory channel, which roughly doubles the per-request overhead on
the small JSON responses this site mostly serves. Here the only per-request
work is the request-ID check and a header append on ``http.response.start``;
the CSP strings are built once.
"""
from __future__ import annotations

import re

from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from ..config import Settings
from ..utils.request_context import clear_request_id, set_request_id

# Routes that must never carry a public cache directive. `/api/admin` and
# `/api/logs` are admin-authenticated and per-user; `/api/health*` backs the
# container probe and the external uptime check, where a cached result is
# actively harmful.
PRIVATE_API_PREFIXES = ("/api/admin", "/api/logs")
NEVER_CACHE_PREFIXES = ("/api/health", "/api/dataplayground/runtime", "/api/dataplayground/copilot")
# Scripts served from the dist root without a content hash in the filename.
UNHASHED_SCRIPTS = frozenset({"/ga-init.js"})
ATLAS_PREFIX = "/opendatacenter"
ATLAS_MAP_CONNECT = "https://demotiles.maplibre.org"
DEMO_CSP = (
    "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; "
    "font-src 'self'; connect-src 'none'; worker-src 'none'; object-src 'none'; "
    "base-uri 'none'; form-action 'none'; frame-src 'none'; frame-ancestors 'none'"
)

# A client-supplied X-Request-ID is echoed in the response and stamped on
# every log line, so only accept short, boring values; anything else gets a
# fresh server-generated ID.
REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._-]{8,64}$")

# The resume PDF is shown in a same-origin <iframe> (PDFViewer), so it is the
# one response allowed to be framed, and only by this site.
FRAMEABLE_PATHS = frozenset({"/api/resume"})

IMMUTABLE = "public, max-age=31536000, immutable"
ONE_DAY = "public, max-age=86400"
# Portfolio content is static JSON, but five of these gate the first render.
# A short TTL with a longer stale window keeps repeat visits and refreshes off
# the critical path without making edits slow to appear. Revalidation is a
# cheap 304 (see api/content.py).
PUBLIC_CONTENT = "public, max-age=60, stale-while-revalidate=300"

GA_SCRIPT_SOURCES = "https://www.googletagmanager.com https://www.google-analytics.com"
GA_CONNECT_SOURCES = (
    "https://www.google-analytics.com https://*.google-analytics.com "
    "https://*.analytics.google.com https://www.googletagmanager.com"
)

_STATIC_SECURITY_HEADERS = (
    ("X-Content-Type-Options", "nosniff"),
    ("Referrer-Policy", "strict-origin-when-cross-origin"),
    ("Permissions-Policy", "camera=(), microphone=(), geolocation=()"),
    ("Cross-Origin-Opener-Policy", "same-origin"),
    # Ignored over plain HTTP (local dev); effective behind Cloud Run's TLS
    ("Strict-Transport-Security", "max-age=31536000; includeSubDomains"),
)


def websocket_origins(settings: Settings) -> str:
    """wss:// equivalents of the deployed HTTPS origins.

    CSP Level 3 lets 'self' match same-host wss://, but older Safari does not,
    so the production hosts are listed explicitly for the chat socket.
    """
    origins = [*settings.allowed_origins, settings.production_url]
    hosts = {
        "wss://" + origin[len("https://"):].rstrip("/")
        for origin in origins
        if origin.startswith("https://")
    }
    return "".join(f" {host}" for host in sorted(hosts))


def build_csp(
    settings: Settings, frame_ancestors: str = "'none'", extra_connect: str = ""
) -> str:
    """Content-Security-Policy for every response.

    No 'unsafe-inline' in script-src: the GA bootstrap lives in
    /ga-init.js, and the JSON-LD block in index.html is a data block the
    browser never executes. style-src keeps 'unsafe-inline' for Emotion/MUI
    and the inline @font-face block in index.html. Fonts are self-hosted
    under /fonts/, so no Google Fonts origins are allowed.
    """
    return (
        "default-src 'self'; "
        "base-uri 'self'; "
        "object-src 'none'; "
        "form-action 'self'; "
        f"frame-ancestors {frame_ancestors}; "
        "img-src 'self' data: https:; "
        "font-src 'self' data:; "
        "style-src 'self' 'unsafe-inline'; "
        f"script-src 'self' {GA_SCRIPT_SOURCES}; "
        f"connect-src 'self' {GA_CONNECT_SOURCES}{websocket_origins(settings)}{extra_connect}; "
        "frame-src 'self'; "
        "worker-src 'self' blob:; "
        "upgrade-insecure-requests"
    )


def cache_control_for(path: str, method: str, status: int, content_type: str) -> str | None:
    """The Cache-Control a response gets when its handler did not set one.

    Vite emits content-hashed filenames under /assets/, so those files can be
    cached forever. Versioned font files are cached forever too. Images are unhashed, so they get a shorter TTL. HTML must
    always be revalidated so deploys take effect immediately.
    """
    if path.startswith(ATLAS_PREFIX + "/v1/") or path.startswith(ATLAS_PREFIX + "/mcp"):
        # Revoked source rights must not survive in a shared browser/proxy cache.
        return "no-store"
    if path.startswith(ATLAS_PREFIX + "/assets/"):
        return IMMUTABLE if status in (200, 304) else "no-store"
    if path in (ATLAS_PREFIX, ATLAS_PREFIX + "/"):
        return "no-cache"
    if path.startswith("/assets/"):
        return IMMUTABLE
    if path.startswith("/fonts/") and path.endswith(".woff2"):
        # Self-hosted font files carry their release in the name
        # (montserrat-v31-...), so a new version is a new URL.
        return IMMUTABLE
    if path.startswith(("/images/", "/api/assets/")):
        return ONE_DAY
    if (
        path == "/"
        or path.endswith(".html")
        or path in UNHASHED_SCRIPTS
        # SPA history fallback: /admin and unknown paths get index.html
        or content_type.startswith("text/html")
    ):
        # Unhashed root scripts (the GA consent bootstrap) revalidate like the
        # HTML that loads them; otherwise browsers cache them heuristically and
        # keep running a stale consent default.
        return "no-cache"
    if path.startswith(NEVER_CACHE_PREFIXES):
        # Health must never be served from a cache. A stale "healthy" 200 held
        # by any intermediary would hide a real outage from the external
        # uptime check for the life of the entry.
        return "no-store"
    if (
        path.startswith("/api/")
        and method == "GET"
        # 304 repeats the policy of the 200 it revalidates. Errors are never
        # cached, and anything requiring authentication is per-user and must
        # not land in a shared cache.
        and status in (200, 304)
        and not path.startswith(PRIVATE_API_PREFIXES)
    ):
        return PUBLIC_CONTENT
    return None


class ResponseHeadersMiddleware:
    """Attach the request ID, cache policy and security headers."""

    def __init__(self, app: ASGIApp, settings: Settings) -> None:
        self.app = app
        self.synthetic_demo = settings.opendatacenter_synthetic_demo
        self.csp_default = build_csp(settings)
        self.csp_frameable = build_csp(settings, "'self'")
        self.csp_atlas = build_csp(settings, extra_connect=f" {ATLAS_MAP_CONNECT}")

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        incoming = Headers(scope=scope).get("x-request-id")
        if not (incoming and REQUEST_ID_PATTERN.match(incoming)):
            incoming = None
        request_id = set_request_id(incoming)
        scope.setdefault("state", {})["request_id"] = request_id

        path: str = scope["path"]
        method: str = scope["method"]
        frameable = path in FRAMEABLE_PATHS

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers["X-Request-ID"] = request_id
                if self.synthetic_demo and (path == ATLAS_PREFIX or path.startswith(ATLAS_PREFIX + "/")):
                    headers["Cache-Control"] = "no-cache" if message["status"] in (200, 308) else "no-store"
                elif path.startswith(ATLAS_PREFIX + "/v1/") or path.startswith(ATLAS_PREFIX + "/mcp"):
                    headers["Cache-Control"] = "no-store"
                elif path.startswith(ATLAS_PREFIX + "/assets/") and message["status"] not in (200, 304):
                    headers["Cache-Control"] = "no-store"
                elif "cache-control" not in headers:
                    policy = cache_control_for(
                        path, method, message["status"], headers.get("content-type", "")
                    )
                    if policy:
                        headers["Cache-Control"] = policy
                for name, value in _STATIC_SECURITY_HEADERS:
                    headers[name] = value
                headers["X-Frame-Options"] = "SAMEORIGIN" if frameable else "DENY"
                headers["Content-Security-Policy"] = (
                    DEMO_CSP if self.synthetic_demo and (path == ATLAS_PREFIX or path.startswith(ATLAS_PREFIX + "/"))
                    else self.csp_frameable if frameable else self.csp_atlas
                    if path == ATLAS_PREFIX or path.startswith(ATLAS_PREFIX + "/")
                    else self.csp_default
                )
            await send(message)

        try:
            await self.app(scope, receive, send_with_headers)
        finally:
            clear_request_id()
