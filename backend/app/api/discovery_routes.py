"""Root-level documents for crawlers, LLM agents and recruiting software.

``/llms.txt``, ``/llms-full.txt``, ``/resume.json`` and ``/sitemap.xml`` are
generated from the portfolio JSON (see ``discovery.py``) and served through the
same pre-rendered, ETag and gzip path as the content API. They live at the site
root because that is where the conventions look for them, so this router is
mounted without the ``/api`` prefix (see ``api/__init__.py``).
"""
from functools import cache

from fastapi import APIRouter, Request, Response

from . import discovery
from .content import JsonPayload, build_bytes_payload, payload_response

router = APIRouter()

# Public, read-only documents: any origin may fetch them (JSON Resume tools run
# in the browser). Content changes only on deploy, so a short TTL is enough.
_CACHE = "public, max-age=300, stale-while-revalidate=3600"
_OPEN_HEADERS = {"Cache-Control": _CACHE, "Access-Control-Allow-Origin": "*"}
_SITEMAP_HEADERS = {"Cache-Control": _CACHE}


@cache
def _payload(name: str) -> JsonPayload:
    return build_bytes_payload(getattr(discovery, name)())


def _route(path: str, builder: str, media_type: str, headers: dict[str, str]) -> None:
    async def handler(request: Request) -> Response:
        return payload_response(request, _payload(builder), media_type, headers)

    handler.__name__ = builder
    router.add_api_route(path, handler, methods=["GET", "HEAD"], include_in_schema=False)


_route("/llms.txt", "llms_txt", "text/plain; charset=utf-8", _OPEN_HEADERS)
_route("/llms-full.txt", "llms_full_txt", "text/plain; charset=utf-8", _OPEN_HEADERS)
_route("/resume.json", "resume_json", "application/json", _OPEN_HEADERS)
_route("/sitemap.xml", "sitemap_xml", "application/xml", _SITEMAP_HEADERS)
