"""Opt-in redirect from alias hostnames to the canonical host.

Off unless ALIAS_HOSTS is set. Only a request whose Host header (port stripped,
case-insensitive) is listed in ALIAS_HOSTS is touched, and only GET/HEAD. The
target host is always the configured CANONICAL_HOST, never anything taken from
the request, so Host-header tricks cannot steer the redirect off-site.

Deliberately ignored: X-Forwarded-Host and Forwarded (a client can send them
and Cloud Run does not rewrite them), the health probes, WebSocket upgrades,
and any host not explicitly listed (*.run.app, tagged canary URLs, localhost).
"""
from __future__ import annotations

from urllib.parse import quote

from starlette.datastructures import Headers
from starlette.types import ASGIApp, Receive, Scope, Send

from ..config import Settings

REDIRECT_METHODS = frozenset({"GET", "HEAD"})
EXEMPT_PREFIXES = ("/api/health", "/ws/")
# Percent-encoding is preserved; everything else outside this set is quoted.
_PATH_SAFE = "/%:@!$&'()*+,;=-._~"
_QUERY_SAFE = _PATH_SAFE + "?"


def normalise_host(raw: str) -> str:
    """Lowercase, strip a trailing port and one trailing dot. IPv6 literals pass through unmatched."""
    host = raw.strip().lower()
    if host.startswith("["):
        return host
    host = host.rsplit(":", 1)[0] if ":" in host else host
    return host[:-1] if host.endswith(".") else host


def build_target(canonical: str, path: str, query: str) -> str | None:
    """https://canonical + a safe path and query, or None when the path is not origin-form."""
    if not path.startswith("/"):
        return None  # absolute-URI request line or garbage: leave alone
    path = "/" + path.lstrip("/")  # "//evil.com" can never become a scheme-relative URL
    target = "https://" + canonical + quote(path, safe=_PATH_SAFE)
    if query:
        target += "?" + quote(query, safe=_QUERY_SAFE)
    return target


class CanonicalHostMiddleware:
    def __init__(self, app: ASGIApp, settings: Settings) -> None:
        self.app = app
        self.canonical = settings.canonical_host
        self.aliases = frozenset(settings.alias_hosts)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if not self.aliases or scope["type"] != "http" or scope.get("method") not in REDIRECT_METHODS:
            await self.app(scope, receive, send)
            return
        path: str = scope.get("path", "")
        if path.startswith(EXEMPT_PREFIXES):
            await self.app(scope, receive, send)
            return
        host = normalise_host(Headers(scope=scope).get("host", ""))
        if host not in self.aliases:
            await self.app(scope, receive, send)
            return
        raw_path = scope.get("raw_path")
        raw = raw_path.decode("latin-1") if raw_path else path
        query = scope.get("query_string", b"").decode("latin-1")
        location = build_target(self.canonical, raw.split("?", 1)[0], query)
        if location is None:
            await self.app(scope, receive, send)
            return
        headers = [(b"location", location.encode("latin-1")), (b"content-length", b"0"), (b"cache-control", b"public, max-age=3600")]
        await send({"type": "http.response.start", "status": 301, "headers": headers})
        await send({"type": "http.response.body", "body": b""})
