"""Send jckail.com/jobbr to the Jobdog app.

Jobdog runs as its own service behind its own load balancer at jobdog.ai and
requires that canonical origin for sign-in (JWT authorized party and write
Origin checks), so this is a redirect, never a same-origin proxy. Cloud Run
domain mappings cannot route by path, which is why it lives here.

The destination is a fixed constant and the request path is only ever appended
after it, so a crafted path cannot move the redirect to another host.
"""

from urllib.parse import quote

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse

router = APIRouter()

JOBDOG_APP_URL = "https://jobdog.ai/jobbr/"

# 302, not 301: browsers cache a 301 indefinitely, which would make moving or
# retiring this target impossible to roll out. Promote to 301 once it is final.
STATUS = 302


def target_for(path: str, query: str) -> str:
    """Build the Jobdog URL for the part of the request path after /jobbr/."""
    segments = [s for s in path.split("/") if s]
    # Dot segments would be resolved by the browser and could climb out of /jobbr/.
    if any(s in (".", "..") for s in segments):
        segments = []
    url = JOBDOG_APP_URL + quote("/".join(segments), safe="/")
    if path.endswith("/") and segments:
        url += "/"
    return f"{url}?{query}" if query else url


@router.api_route("/jobbr", methods=["GET", "HEAD"], include_in_schema=False)
@router.api_route("/jobbr/{path:path}", methods=["GET", "HEAD"], include_in_schema=False)
async def jobbr_to_jobdog(request: Request, path: str = "") -> RedirectResponse:
    return RedirectResponse(target_for(path, request.url.query), status_code=STATUS)
