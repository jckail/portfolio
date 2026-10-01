"""Pre-serialized responses for the public content routes.

The portfolio JSON is fixed for the life of the process, yet five of these
routes gate the first render. Serializing, gzipping and hashing on every hit
is wasted work, so each payload is rendered once into bytes, a gzip variant
and a strong ETag. A request then costs a dict lookup, and a revalidation
with a matching ``If-None-Match`` is a body-less 304.

The bytes are produced exactly the way FastAPI's ``response_model`` path
renders them (JSON-mode dump, compact separators, UTF-8), so the wire format
is unchanged. Routes keep ``response_model`` for the OpenAPI schema.
"""
from __future__ import annotations

import gzip
import hashlib
import json
from collections.abc import Mapping
from dataclasses import dataclass
from functools import cache
from typing import Any

from fastapi import Request, Response
from pydantic import BaseModel, RootModel

from ..middleware.compression import GZIP_MINIMUM_SIZE
from ..models.data_loader import load_aboutme, load_contact, load_experience, load_projects, load_skills

_LOADERS = {
    "aboutme": load_aboutme,
    "contact": load_contact,
    "experience": load_experience,
    "projects": load_projects,
    "skills": load_skills,
}


@dataclass(frozen=True, slots=True)
class JsonPayload:
    body: bytes
    etag: str
    gzip_body: bytes | None = None
    gzip_etag: str | None = None


def _render(data: Any) -> bytes:
    # Matches starlette.responses.JSONResponse.render byte for byte.
    return json.dumps(
        data, ensure_ascii=False, allow_nan=False, indent=None, separators=(",", ":")
    ).encode("utf-8")


def build_payload(data: Any) -> JsonPayload:
    body = _render(data)
    digest = hashlib.sha256(body).hexdigest()[:32]
    if len(body) < GZIP_MINIMUM_SIZE:
        return JsonPayload(body=body, etag=f'"{digest}"')
    # mtime=0 keeps the gzip bytes deterministic across instances. The
    # compressed variant gets its own strong tag: it is a different
    # representation of the same resource (RFC 9110 section 8.8.3).
    return JsonPayload(
        body=body,
        etag=f'"{digest}"',
        gzip_body=gzip.compress(body, compresslevel=9, mtime=0),
        gzip_etag=f'"{digest}-gz"',
    )


def _dump(model: BaseModel) -> Any:
    return model.model_dump(mode="json")


@cache
def collection_payload(name: str) -> JsonPayload:
    """The whole document behind ``GET /api/<name>``."""
    return build_payload(_dump(_LOADERS[name]()))


@cache
def item_payloads(name: str) -> Mapping[str, JsonPayload]:
    """One payload per key of a keyed collection (skills, experience, projects)."""
    model = _LOADERS[name]()
    if not isinstance(model, RootModel):
        raise TypeError(f"{name} is not a keyed collection")
    # A plain dict keyed by data slugs; lookups use `.get`, so a key such as
    # "constructor" or "__proto__" is simply absent.
    return {key: build_payload(_dump(item)) for key, item in model.root.items()}


def warm() -> None:
    """Render every payload now (called at startup, off the event loop)."""
    for name in _LOADERS:
        collection_payload(name)
    for name in ("experience", "projects", "skills"):
        item_payloads(name)


def _etag_matches(if_none_match: str, *etags: str | None) -> bool:
    """Weak comparison, as RFC 9110 requires for If-None-Match."""
    candidates = {tag for tag in etags if tag}
    for raw in if_none_match.split(","):
        tag = raw.strip()
        if tag == "*":
            return True
        if tag.removeprefix("W/") in candidates:
            return True
    return False


def payload_response(request: Request, payload: JsonPayload) -> Response:
    """200 with the best encoding the client accepts, or 304 if it is current."""
    wants_gzip = payload.gzip_body is not None and "gzip" in request.headers.get("accept-encoding", "")
    etag = payload.gzip_etag if wants_gzip else payload.etag
    headers = {"ETag": etag}
    if payload.gzip_body is not None:
        headers["Vary"] = "Accept-Encoding"

    if_none_match = request.headers.get("if-none-match")
    if if_none_match and _etag_matches(if_none_match, payload.etag, payload.gzip_etag):
        return Response(status_code=304, headers=headers)

    if wants_gzip:
        headers["Content-Encoding"] = "gzip"
        return Response(payload.gzip_body, media_type="application/json", headers=headers)
    return Response(payload.body, media_type="application/json", headers=headers)
