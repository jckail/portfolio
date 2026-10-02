"""Public lab catalog and the 302 forwards for apps hosted elsewhere.

``/api/labs`` and ``/api/labs/{slug}`` use the same pre-rendered, ETag and
gzip path as the other content routes (``content.py``). Forwards are plain
root-level routes declared per slug at import time, so they win over the SPA
fallback mounted at ``/``; a catch-all route could not fall through to it.
"""
from __future__ import annotations

from collections.abc import Mapping
from functools import cache

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import RedirectResponse

from ..labs import load_catalog
from ..models.labs import Forward, Lab
from .content import JsonPayload, build_payload, payload_response

router = APIRouter(prefix="/labs", tags=["labs"])
FORWARD_HEADERS = {"X-Robots-Tag": "noindex", "Cache-Control": "public, max-age=300"}


@cache
def _list_payload() -> JsonPayload:
    return build_payload([lab.model_dump(mode="json") for lab in load_catalog().labs.values()])


@cache
def _item_payloads() -> Mapping[str, JsonPayload]:
    return {slug: build_payload(lab.model_dump(mode="json")) for slug, lab in load_catalog().labs.items()}


def clear_caches() -> None:
    _list_payload.cache_clear()
    _item_payloads.cache_clear()


@router.get("", response_model=list[Lab])
async def list_labs(request: Request) -> Response:
    return payload_response(request, _list_payload())


@router.get("/{slug}", response_model=Lab)
async def get_lab(request: Request, slug: str) -> Response:
    payload = _item_payloads().get(slug)
    if payload is None:
        raise HTTPException(status_code=404, detail="Lab not found")
    return payload_response(request, payload)


def _redirect_to(target: str):
    async def handler() -> Response:
        return RedirectResponse(target, status_code=302, headers=FORWARD_HEADERS)

    return handler


def build_forward_router(forwards: Mapping[str, Forward]) -> APIRouter:
    """A router with ``/<slug>`` and ``/<slug>/`` (GET, HEAD) for each forward."""
    built = APIRouter()
    for forward in forwards.values():
        handler = _redirect_to(forward.target)
        for path in (f"/{forward.slug}", f"/{forward.slug}/"):
            built.add_api_route(path, handler, methods=["GET", "HEAD"], include_in_schema=False)
    return built


forwards_router = build_forward_router(load_catalog().forwards)
