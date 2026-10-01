"""GZip for responses that benefit from it.

Starlette's GZipMiddleware compresses anything over its threshold, including
images and fonts that are already compressed: the result is a few bytes
larger, costs CPU, and loses its Content-Length to chunked streaming. Those
paths bypass compression entirely. Responses that already carry a
Content-Encoding (the pre-compressed content and static caches) pass through
GZipMiddleware untouched on their own.
"""
from starlette.middleware.gzip import GZipMiddleware
from starlette.types import Receive, Scope, Send

GZIP_MINIMUM_SIZE = 1024

PRECOMPRESSED_SUFFIXES = (
    ".avif", ".gif", ".ico", ".jpeg", ".jpg", ".mp4", ".png", ".webm", ".webp", ".woff", ".woff2",
)
# Routes that return already-compressed media from a non-suffixed path.
PRECOMPRESSED_PATHS = frozenset({"/api/zuni"})


class SelectiveGZipMiddleware(GZipMiddleware):
    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http":
            path: str = scope["path"]
            if path in PRECOMPRESSED_PATHS or path.lower().endswith(PRECOMPRESSED_SUFFIXES):
                await self.app(scope, receive, send)
                return
        await super().__call__(scope, receive, send)
