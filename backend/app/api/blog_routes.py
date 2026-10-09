"""Public blog documents; files only, no network or authenticated writes."""
from functools import lru_cache

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import RedirectResponse

from .. import blog
from .content import build_bytes_payload, payload_response

router = APIRouter()


@lru_cache(maxsize=256)
def _payload(slug: str, publication_day: str):
    if slug == "feed.xml":
        return build_bytes_payload(blog.feed())
    post = next((p for p in blog.posts() if p.slug == slug), None) if slug else None
    if slug and post is None:
        raise HTTPException(status_code=404, detail="Article not found")
    return build_bytes_payload(blog.document(post))


@router.api_route("/blog/", methods=["GET", "HEAD"], include_in_schema=False)
def trailing_slash(request: Request) -> RedirectResponse:
    theme = request.query_params.get("theme")
    return RedirectResponse("/blog" + (f"?theme={theme}" if theme in {"light", "dark"} else ""), status_code=308)


@router.api_route("/blog", methods=["GET", "HEAD"], include_in_schema=False)
@router.api_route("/blog/{slug}", methods=["GET", "HEAD"], include_in_schema=False)
def article(request: Request, slug: str = "") -> Response:
    media = "application/rss+xml" if slug == "feed.xml" else "text/html"
    path = "/blog" + (f"/{slug}" if slug else "")
    post = next((p for p in blog.posts() if p.slug == slug), None)
    canonical = post.source_url if post and post.source_url else blog.ORIGIN + path
    return payload_response(request, _payload(slug, str(blog.publication_day())), media, {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        "Link": f'<{canonical}>; rel="canonical"',
    })
