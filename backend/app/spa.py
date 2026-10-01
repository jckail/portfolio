"""Static file serving for the built SPA, with a history-API fallback.

The React app reads window.location for its routes, so a hard load of a client route such as
``/admin`` reaches the server as a plain GET. Without a fallback that request
falls through to StaticFiles and returns ``{"detail": "Not Found"}`` JSON.

Text files (the JS/CSS chunks, index.html, SVGs) are also served from an
in-memory gzip cache. The dist tree is fixed for the life of a deploy, yet
GZipMiddleware recompressed every chunk on every request at level 9 (about
10 ms of CPU for the 180 KB chat chunk) and streamed it without a
Content-Length. Each file is now compressed once.
"""
import gzip
import hashlib
import logging
import mimetypes
import os
import re
import threading
from collections.abc import Callable
from dataclasses import dataclass
from email.utils import formatdate

from starlette.datastructures import Headers
from starlette.exceptions import HTTPException
from starlette.responses import FileResponse, Response
from starlette.routing import get_route_path
from starlette.staticfiles import NotModifiedResponse, StaticFiles
from starlette.types import Scope

from .middleware.compression import GZIP_MINIMUM_SIZE

logger = logging.getLogger(__name__)

# Client routes the SPA actually renders (see frontend/src/main.tsx and the
# pathname check in app/components/main-content.tsx). Other unknown paths
# still get the SPA shell so the visitor lands on the site, but with a 404
# status so crawlers do not index junk URLs as duplicate homepages.
SPA_ROUTES = frozenset({"/", "/admin"})

# Never answer these with index.html. /api and /ws keep JSON 404s for
# clients; a missing /assets chunk must fail loudly rather than parse HTML
# as JavaScript after a deploy.
NO_FALLBACK_PREFIXES = ("/api/", "/ws/", "/assets/")
NO_FALLBACK_EXACT = frozenset({"/api", "/ws", "/assets"})

GZIP_MIN_BYTES = GZIP_MINIMUM_SIZE
GZIP_MAX_FILE_BYTES = 4 * 1024 * 1024
GZIP_CACHE_MAX_BYTES = 16 * 1024 * 1024
COMPRESSIBLE_SUFFIXES = (
    ".js", ".mjs", ".css", ".html", ".svg", ".json", ".txt", ".xml", ".webmanifest", ".map",
)


@dataclass(frozen=True, slots=True)
class GzipEntry:
    mtime_ns: int
    size: int
    body: bytes
    etag: str
    last_modified: str


class GzipCache:
    """gzip bodies keyed by path, valid while the file's mtime and size hold."""

    def __init__(self, max_bytes: int = GZIP_CACHE_MAX_BYTES) -> None:
        self.max_bytes = max_bytes
        self._entries: dict[str, GzipEntry] = {}
        self._size = 0
        self._lock = threading.Lock()

    @staticmethod
    def eligible(path: str, stat_result: os.stat_result) -> bool:
        return (
            path.endswith(COMPRESSIBLE_SUFFIXES)
            and GZIP_MIN_BYTES <= stat_result.st_size <= GZIP_MAX_FILE_BYTES
        )

    def get(self, path: str, stat_result: os.stat_result) -> GzipEntry | None:
        """Cached entry for ``path``, compressing on a miss; None if unreadable."""
        entry = self._entries.get(path)
        if entry is not None and (entry.mtime_ns, entry.size) == (stat_result.st_mtime_ns, stat_result.st_size):
            return entry
        try:
            with open(path, "rb") as f:
                raw = f.read()
        except OSError:
            return None
        if len(raw) != stat_result.st_size:
            return None  # rewritten mid-read (local rebuild); serve it uncompressed
        # Same tag FileResponse would send, suffixed: the encoded variant is a
        # different representation, so it must not share the strong ETag.
        etag_base = f"{stat_result.st_mtime}-{stat_result.st_size}"
        entry = GzipEntry(
            mtime_ns=stat_result.st_mtime_ns,
            size=stat_result.st_size,
            # mtime=0 keeps the bytes identical across instances.
            body=gzip.compress(raw, compresslevel=9, mtime=0),
            etag=f'"{hashlib.md5(etag_base.encode(), usedforsecurity=False).hexdigest()}-gz"',
            last_modified=formatdate(stat_result.st_mtime, usegmt=True),
        )
        with self._lock:
            previous = self._entries.pop(path, None)
            if previous is not None:
                self._size -= len(previous.body)
            if self._size + len(entry.body) <= self.max_bytes:
                self._entries[path] = entry
                self._size += len(entry.body)
        return entry

    def warm(self, directory: str) -> int:
        """Compress every eligible file under ``directory``; returns the count."""
        count = 0
        for root, _, files in os.walk(directory):
            for name in files:
                path = os.path.join(root, name)
                try:
                    stat_result = os.stat(path)
                except OSError:
                    continue
                if self.eligible(path, stat_result) and self.get(path, stat_result) is not None:
                    count += 1
        return count


BOOTSTRAP_ELEMENT_ID = "bootstrap-data"
_BOOTSTRAP_OPEN = f'<script type="application/json" id="{BOOTSTRAP_ELEMENT_ID}">'.encode()
_BODY_CLOSE = b"</body>"


def inject_bootstrap(html: bytes, data: bytes) -> bytes:
    """Embed ``data`` (JSON) in ``html`` as a non-executable data block.

    A ``type="application/json"`` script is never run, so the strict
    ``script-src`` CSP still holds. ``data`` must already be script-safe (no
    ``<`` at all, see ``api.content.bootstrap_json``); anything else is
    refused rather than risk closing the element early.
    """
    if b"<" in data:
        raise ValueError("bootstrap data must not contain '<'")
    block = _BOOTSTRAP_OPEN + data + b"</script>"
    at = html.rfind(_BODY_CLOSE)
    if at == -1:
        return html + block
    return html[:at] + block + html[at:]


_ROOT_EMPTY = re.compile(rb'<div id="root">\s*</div>')
_JSONLD = re.compile(rb'<script type="application/ld\+json">.*?</script>', re.S)


def inject_root_content(html: bytes, fragment: bytes) -> bytes:
    """Put ``fragment`` (server-rendered HTML) inside the empty ``#root``.

    React's ``createRoot`` discards a container's children on first render, so
    the fragment only serves readers that never run the app. It is not
    hydrated, so it need not match React's markup, only the site's content.
    """
    match = _ROOT_EMPTY.search(html)
    if match is None:
        return html
    return html[: match.start()] + b'<div id="root">' + fragment + b"</div>" + html[match.end():]


def inject_jsonld(html: bytes, data: bytes) -> bytes:
    """Replace the static JSON-LD block with ``data`` (script-safe JSON)."""
    if b"<" in data:
        raise ValueError("JSON-LD data must not contain '<'")
    block = b'<script type="application/ld+json">\n' + data + b"\n</script>"
    match = _JSONLD.search(html)
    if match is None:
        return html
    return html[: match.start()] + block + html[match.end():]


# Alternates and the canonical URL, also sent as a Link header so agents that
# only read headers (HEAD requests) find them. Absolute URLs on the canonical
# host, matching <link rel="canonical"> in index.html.
def _link_header() -> str:
    from .api.discovery import CANONICAL_ORIGIN, RESUME_PDF_PATH

    return ", ".join(
        (
            f'<{CANONICAL_ORIGIN}/>; rel="canonical"',
            f'<{CANONICAL_ORIGIN}/llms.txt>; rel="alternate"; type="text/plain"',
            f'<{CANONICAL_ORIGIN}/resume.json>; rel="alternate"; type="application/json"',
            f'<{CANONICAL_ORIGIN}{RESUME_PDF_PATH}>; rel="alternate"; type="application/pdf"',
        )
    )


# Only the home page is the document of record. Everything else that falls
# back to index.html (the admin login, unknown URLs) must stay out of indexes.
HOME_PATHS = frozenset({"/", "/index.html"})


@dataclass(frozen=True, slots=True)
class IndexEntry:
    mtime_ns: int
    size: int
    body: bytes
    etag: str
    gzip_body: bytes
    gzip_etag: str


def _accepts_gzip(scope: Scope) -> bool:
    # Same test GZipMiddleware applies.
    return "gzip" in Headers(scope=scope).get("accept-encoding", "")


def _is_html_navigation(scope: Scope) -> bool:
    for name, value in scope.get("headers", []):
        if name == b"accept":
            return b"text/html" in value.lower()
    return False


def spa_fallback_status(route_path: str) -> int:
    # Exact match: main-content.tsx opens the admin login only when
    # pathname === "/admin", so "/admin/" renders the plain homepage and must
    # not be served as a 200 duplicate of it.
    return 200 if route_path in SPA_ROUTES else 404


class SPAStaticFiles(StaticFiles):
    """StaticFiles that serves index.html for unmatched HTML navigations and
    gzip-encoded text files from a per-process cache."""

    def __init__(
        self,
        *args,
        bootstrap: Callable[[], bytes] | None = None,
        snapshot: Callable[[], bytes] | None = None,
        jsonld: Callable[[], bytes] | None = None,
        **kwargs,
    ) -> None:
        super().__init__(*args, **kwargs)
        self.gzip_cache = GzipCache()
        # Returns the JSON inlined into every index.html response, so the SPA
        # can render the hero without first fetching the content API.
        self._bootstrap = bootstrap
        # With a bootstrap, the home page also carries a server-rendered HTML
        # snapshot of the portfolio and a richer JSON-LD graph, both built from
        # the same data. Callers may override either.
        if bootstrap is not None:
            from .api import discovery

            snapshot = snapshot or discovery.snapshot_html
            jsonld = jsonld or discovery.jsonld_json
        self._snapshot = snapshot
        self._jsonld = jsonld
        # One entry per variant: the home page (with the snapshot) and the
        # bare shell served for /admin and unknown URLs.
        self._index: dict[bool, IndexEntry] = {}
        self._index_lock = threading.Lock()

    @property
    def index_path(self) -> str:
        return os.path.join(str(self.directory), "index.html")

    def warm_gzip_cache(self) -> None:
        """Pre-compress the dist tree (blocking; run it in a thread)."""
        if self.directory is not None:
            count = self.gzip_cache.warm(str(self.directory))
            logger.info("Pre-compressed %d static files", count)
            if self._bootstrap is not None:
                try:
                    stat_result = os.stat(self.index_path)
                    self._index_entry(stat_result, home=True)
                    self._index_entry(stat_result, home=False)
                except OSError:
                    pass

    def _index_entry(self, stat_result: os.stat_result, home: bool = False) -> IndexEntry | None:
        """index.html with the bootstrap block, rebuilt only when the file changes."""
        entry = self._index.get(home)
        if entry is not None and (entry.mtime_ns, entry.size) == (stat_result.st_mtime_ns, stat_result.st_size):
            return entry
        try:
            with open(self.index_path, "rb") as f:
                raw = f.read()
        except OSError:
            return None
        if len(raw) != stat_result.st_size:
            return None  # rewritten mid-read (local rebuild)
        if self._jsonld is not None:
            raw = inject_jsonld(raw, self._jsonld())
        if home and self._snapshot is not None:
            raw = inject_root_content(raw, self._snapshot())
        body = inject_bootstrap(raw, self._bootstrap())
        # A content hash, not mtime: the body depends on the data as well as
        # the file, and must not keep an old tag across a content-only deploy.
        digest = hashlib.sha256(body).hexdigest()[:32]
        entry = IndexEntry(
            mtime_ns=stat_result.st_mtime_ns,
            size=stat_result.st_size,
            body=body,
            etag=f'"{digest}"',
            gzip_body=gzip.compress(body, compresslevel=9, mtime=0),
            gzip_etag=f'"{digest}-gz"',
        )
        with self._index_lock:
            self._index[home] = entry
        return entry

    def _index_response(self, scope: Scope, status_code: int) -> Response | None:
        try:
            stat_result = os.stat(self.index_path)
        except OSError:
            return None
        home = status_code == 200 and get_route_path(scope) in HOME_PATHS
        entry = self._index_entry(stat_result, home=home)
        if entry is None:
            return None
        wants_gzip = _accepts_gzip(scope)
        headers = {
            # No Last-Modified: the body also depends on the content data,
            # so the file's mtime would let If-Modified-Since return a stale
            # 304. Revalidation goes through the content-hash ETag only.
            "etag": entry.gzip_etag if wants_gzip else entry.etag,
        }
        if home:
            headers["link"] = _link_header()
        else:
            headers["x-robots-tag"] = "noindex"
        if status_code == 200 and self.is_not_modified(Headers(headers), Headers(scope=scope)):
            return NotModifiedResponse(Headers(headers))
        if wants_gzip:
            # GZipMiddleware adds Vary itself to the responses it passes
            # through uncompressed; a pre-encoded one must carry its own.
            headers["content-encoding"] = "gzip"
            headers["vary"] = "Accept-Encoding"
        return Response(
            entry.gzip_body if wants_gzip else entry.body,
            status_code=status_code,
            media_type="text/html",
            headers=headers,
        )

    def _is_index(self, path: str) -> bool:
        return self._bootstrap is not None and os.path.abspath(path) == os.path.abspath(self.index_path)

    def file_response(
        self,
        full_path,
        stat_result: os.stat_result,
        scope: Scope,
        status_code: int = 200,
    ) -> Response:
        path = str(full_path)
        if self._is_index(path):
            response = self._index_response(scope, status_code)
            if response is not None:
                return response
        if (
            status_code == 200
            # HEAD and Range requests keep the plain FileResponse semantics.
            and scope["method"] == "GET"
            and not Headers(scope=scope).get("range")
            and self.gzip_cache.eligible(path, stat_result)
            and _accepts_gzip(scope)
        ):
            entry = self.gzip_cache.get(path, stat_result)
            if entry is not None:
                return self._gzip_response(path, scope, entry)
        return super().file_response(full_path, stat_result, scope, status_code)

    def _gzip_response(self, path: str, scope: Scope, entry: GzipEntry) -> Response:
        headers = {
            "etag": entry.etag,
            "last-modified": entry.last_modified,
            "content-encoding": "gzip",
            "vary": "Accept-Encoding",
        }
        if self.is_not_modified(Headers(headers), Headers(scope=scope)):
            return NotModifiedResponse(Headers(headers))
        media_type = mimetypes.guess_type(path)[0] or "text/plain"
        return Response(entry.body, media_type=media_type, headers=headers)

    async def get_response(self, path: str, scope: Scope) -> Response:
        try:
            return await super().get_response(path, scope)
        except HTTPException as exc:
            if exc.status_code != 404 or not self._should_fallback(scope):
                raise
            index = self.index_path
            if not os.path.isfile(index):
                raise
            status_code = spa_fallback_status(get_route_path(scope))
            if self._bootstrap is not None:
                response = self._index_response(scope, status_code)
                if response is not None:
                    return response
            return FileResponse(
                index,
                status_code=status_code,
                media_type="text/html",
            )

    @staticmethod
    def _should_fallback(scope: Scope) -> bool:
        if scope["method"] not in ("GET", "HEAD"):
            return False
        route_path = get_route_path(scope)
        if route_path in NO_FALLBACK_EXACT or route_path.startswith(NO_FALLBACK_PREFIXES):
            return False
        return _is_html_navigation(scope)
