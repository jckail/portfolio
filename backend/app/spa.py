"""Static file serving for the built SPA, with a history-API fallback.

The React app uses BrowserRouter, so a hard load of a client route such as
``/admin`` reaches the server as a plain GET. Without a fallback that request
falls through to StaticFiles and returns ``{"detail": "Not Found"}`` JSON.
"""
import os

from starlette.exceptions import HTTPException
from starlette.responses import FileResponse, Response
from starlette.routing import get_route_path
from starlette.staticfiles import StaticFiles
from starlette.types import Scope

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
    """StaticFiles that serves index.html for unmatched HTML navigations."""

    async def get_response(self, path: str, scope: Scope) -> Response:
        try:
            return await super().get_response(path, scope)
        except HTTPException as exc:
            if exc.status_code != 404 or not self._should_fallback(scope):
                raise
            index = os.path.join(str(self.directory), "index.html")
            if not os.path.isfile(index):
                raise
            return FileResponse(
                index,
                status_code=spa_fallback_status(get_route_path(scope)),
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
