"""Narrow same-origin gateway for the separately deployed research atlas.

The upstream is operator configuration, never a request parameter. The route
is dormant until that configuration is set after the atlas rights gate.
"""

import hashlib
import json
import os
import re
import stat
from collections.abc import AsyncIterator
from pathlib import Path
from types import MappingProxyType
from urllib.parse import urlsplit

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse, Response, StreamingResponse

from .config import Settings, get_settings

router = APIRouter()
PUBLIC_RESOURCES = frozenset(
    {"facilities", "compare", "coverage", "facets", "components", "sources", "changes", "entities", "organizations"}
)
REQUEST_HEADERS = frozenset(
    {
        "accept",
        "content-type",
        "origin",
        "mcp-protocol-version",
        "mcp-session-id",
        "last-event-id",
        "if-none-match",
        "if-modified-since",
        "x-request-id",
    }
)
RESPONSE_HEADERS = frozenset(
    {
        "content-type",
        "content-encoding",
        "etag",
        "last-modified",
        "cache-control",
        "vary",
        "mcp-session-id",
    }
)
MAX_MCP_BODY = 1024 * 1024
_client_factory = httpx.AsyncClient


# Fixed, separately reviewed image artifact. No request or env selects a root.
DEMO_ROOT = Path("/app/opendatacenter-demo")
DEMO_MAX_BYTES = 65536
DEMO_MANIFEST_SHA256 = "1fd130d4a2476346d801b330b76b4e997db7ad7554decbf549bf1aa47d77bf01"
DEMO_FILES = MappingProxyType({
    "index.html": ("45c99c35317b83a8602a351034494a78e5842ab2fb91219b7455b8147661641f", 5636, "text/html; charset=utf-8"),
    "styles.css": ("7efb437bcadf9dd771a88460987bbc9cdb9b94ecf6250fbd668f8c35bb846984", 7468, "text/css; charset=utf-8"),
    "app.js": ("00d001d4e361c0079a1c07bab37a952cf8d78d8528095f9ccdc77579c5c63b25", 9734, "text/javascript; charset=utf-8"),
})


def _read_demo_file(directory: int, name: str) -> bytes:
    # O_NONBLOCK prevents a raced FIFO from blocking before fstat rejects it.
    fd = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=directory)
    try:
        before = os.fstat(fd)
        if not stat.S_ISREG(before.st_mode) or not 0 < before.st_size <= DEMO_MAX_BYTES:
            raise ValueError("Invalid synthetic demo artifact")
        with os.fdopen(fd, "rb", closefd=False) as stream:
            data = stream.read(DEMO_MAX_BYTES + 1)
        after = os.fstat(fd)
        if (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns, before.st_ctime_ns) != (
            after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns, after.st_ctime_ns
        ) or len(data) != before.st_size:
            raise ValueError("Synthetic demo artifact changed during validation")
        return data
    finally:
        os.close(fd)


def load_synthetic_demo(settings: Settings):
    """Validate once in a startup worker; requests consume immutable bytes only."""
    if not settings.opendatacenter_synthetic_demo:
        return MappingProxyType({})
    if settings.opendatacenter_upstream_url:
        raise ValueError("Synthetic demo and atlas upstream are mutually exclusive")
    directory = os.open("/", os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        for part in DEMO_ROOT.parts[1:]:
            child = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=directory)
            os.close(directory)
            directory = child
        if set(os.listdir(directory)) != {*DEMO_FILES, "manifest.json"}:
            raise ValueError("Unexpected synthetic demo package files")
        raw = _read_demo_file(directory, "manifest.json")
        if hashlib.sha256(raw).hexdigest() != DEMO_MANIFEST_SHA256:
            raise ValueError("Unapproved synthetic demo manifest")
        manifest = json.loads(raw)
        if manifest["schema_version"] != 1 or manifest["public_files"] != list(DEMO_FILES):
            raise ValueError("Invalid synthetic demo manifest")
        cached = {}
        for name, (digest, size, mime) in DEMO_FILES.items():
            if manifest["files"][name] != {"sha256": digest, "bytes": size, "mime_type": mime}:
                raise ValueError("Invalid synthetic demo metadata")
            data = _read_demo_file(directory, name)
            if len(data) != size or hashlib.sha256(data).hexdigest() != digest:
                raise ValueError("Unapproved synthetic demo content")
            cached[name] = (data, mime)
        return MappingProxyType(cached)
    except (OSError, ValueError, KeyError, TypeError):
        raise ValueError("Synthetic demo package validation failed") from None
    finally:
        os.close(directory)


def demo_response(path: str, request: Request) -> Response:
    # Reject encoded aliases as well as decoded traversal; only exact ASCII URLs.
    expected = ("/opendatacenter/" + path).encode("ascii", errors="replace")
    if request.method not in ("GET", "HEAD") or request.scope.get("raw_path", b"") != expected:
        raise HTTPException(status_code=404, headers={"Cache-Control": "no-store"})
    name = "index.html" if path == "" else path
    cached = getattr(request.app.state, "opendatacenter_demo", {})
    if name not in DEMO_FILES or name not in cached:
        raise HTTPException(status_code=404, headers={"Cache-Control": "no-store"})
    data, mime = cached[name]
    # Flat filenames are stable URLs, so revalidate rather than cache forever.
    return Response(content=b"" if request.method == "HEAD" else data, headers={
        "Content-Type": mime, "Content-Length": str(len(data)), "Cache-Control": "no-cache",
    })


def upstream_origin(raw: str) -> str | None:
    """Accept only a bare HTTPS Cloud Run service origin."""
    if not raw:
        return None
    parsed = urlsplit(raw)
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or not parsed.hostname.endswith(".run.app")
        or parsed.username
        or parsed.password
        or parsed.port not in (None, 443)
        or parsed.path not in ("", "/")
        or parsed.query
        or parsed.fragment
    ):
        raise ValueError("OPENDATACENTER_UPSTREAM_URL must be an HTTPS *.run.app origin")
    return raw.rstrip("/")


def permitted(path: str, method: str) -> bool:
    """Expose only the SPA, public REST reads and the read-only MCP endpoint."""
    if "\\" in path or any(part in (".", "..") for part in path.split("/")):
        return False
    if path in ("", "/"):
        return method in ("GET", "HEAD")
    if path.startswith("/assets/"):
        return method in ("GET", "HEAD")
    if path in ("/mcp", "/mcp/"):
        return method in ("GET", "POST", "DELETE")
    if path.startswith("/v1/"):
        resource = path.split("/", 3)[2]
        if resource == "entities":
            return method in ("GET", "HEAD") and re.fullmatch(
                r"/v1/entities/[A-Za-z0-9_-]+(?:/history)?", path
            ) is not None
        return method in ("GET", "HEAD") and resource in PUBLIC_RESOURCES
    return False


async def bounded_body(request: Request) -> bytes:
    chunks = bytearray()
    async for chunk in request.stream():
        chunks.extend(chunk)
        if len(chunks) > MAX_MCP_BODY:
            raise HTTPException(status_code=413, detail="MCP request too large")
    return bytes(chunks)


@router.api_route("/opendatacenter", methods=["GET", "HEAD", "POST", "DELETE", "PUT", "PATCH"])
async def canonical_atlas_path(request: Request, settings: Settings = Depends(get_settings)):
    if settings.opendatacenter_synthetic_demo:
        if request.method not in ("GET", "HEAD") or request.scope.get("raw_path") != b"/opendatacenter":
            raise HTTPException(status_code=404, headers={"Cache-Control": "no-store"})
        if not getattr(request.app.state, "opendatacenter_demo", None):
            raise HTTPException(status_code=404, headers={"Cache-Control": "no-store"})
        query = "?" + request.url.query if request.url.query else ""
        return RedirectResponse("/opendatacenter/" + query, status_code=308, headers={"Cache-Control": "no-cache"})
    if request.method not in ("GET", "HEAD"):
        raise HTTPException(status_code=405, headers={"Allow": "GET, HEAD"})
    if upstream_origin(settings.opendatacenter_upstream_url) is None:
        raise HTTPException(status_code=404)
    return RedirectResponse("/opendatacenter/", status_code=308)


@router.api_route(
    "/opendatacenter/{path:path}",
    methods=["GET", "HEAD", "POST", "DELETE", "PUT", "PATCH"],
)
async def atlas_gateway(path: str, request: Request, settings: Settings = Depends(get_settings)):
    if settings.opendatacenter_synthetic_demo:
        return demo_response(path, request)
    origin = upstream_origin(settings.opendatacenter_upstream_url)
    if origin is None:
        raise HTTPException(status_code=404)
    target_path = "/" + path
    if not permitted(target_path, request.method):
        raise HTTPException(status_code=404)
    if target_path == "/mcp":
        target_path = "/mcp/"

    headers = {name: value for name, value in request.headers.items() if name.lower() in REQUEST_HEADERS}
    # Keep the upstream body unencoded; portfolio compression negotiates with
    # the actual browser. httpx otherwise advertises gzip even to identity-only clients.
    headers["accept-encoding"] = "identity"
    body = await bounded_body(request) if request.method == "POST" else b""
    target = f"{origin}/opendatacenter{target_path}"
    if request.url.query:
        target += "?" + request.url.query

    client = _client_factory(timeout=httpx.Timeout(60.0, connect=5.0), follow_redirects=False)
    try:
        upstream = await client.send(client.build_request(request.method, target, headers=headers, content=body), stream=True)
    except httpx.HTTPError:
        await client.aclose()
        raise HTTPException(status_code=502, detail="Atlas upstream unavailable") from None

    async def content() -> AsyncIterator[bytes]:
        try:
            if upstream.is_stream_consumed:
                # MockTransport provides an already buffered response.
                yield upstream.content
            else:
                async for chunk in upstream.aiter_raw():
                    yield chunk
        finally:
            await upstream.aclose()
            await client.aclose()

    response_headers = {name: value for name, value in upstream.headers.items() if name.lower() in RESPONSE_HEADERS}
    if upstream.status_code in (301, 302, 303, 307, 308):
        await upstream.aclose()
        await client.aclose()
        raise HTTPException(status_code=502, detail="Unexpected atlas upstream redirect")
    if request.method == "HEAD":
        await upstream.aclose()
        await client.aclose()
        return Response(status_code=upstream.status_code, headers=response_headers)
    return StreamingResponse(content(), status_code=upstream.status_code, headers=response_headers)
