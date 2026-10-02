"""Narrow same-origin gateway for the separately deployed research atlas.

The upstream is operator configuration, never a request parameter. The route
is dormant until that configuration is set after the atlas rights gate.
"""

from collections.abc import AsyncIterator
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
        return method in ("GET", "HEAD") and resource in PUBLIC_RESOURCES
    return False


async def bounded_body(request: Request) -> bytes:
    chunks = bytearray()
    async for chunk in request.stream():
        chunks.extend(chunk)
        if len(chunks) > MAX_MCP_BODY:
            raise HTTPException(status_code=413, detail="MCP request too large")
    return bytes(chunks)


@router.api_route("/opendatacenter", methods=["GET", "HEAD"])
async def canonical_atlas_path(settings: Settings = Depends(get_settings)):
    if upstream_origin(settings.opendatacenter_upstream_url) is None:
        raise HTTPException(status_code=404)
    return RedirectResponse("/opendatacenter/", status_code=308)


@router.api_route(
    "/opendatacenter/{path:path}",
    methods=["GET", "HEAD", "POST", "DELETE", "PUT", "PATCH"],
)
async def atlas_gateway(path: str, request: Request, settings: Settings = Depends(get_settings)):
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
