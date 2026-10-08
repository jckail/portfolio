from fastapi import APIRouter

from .admin_routes import router as admin_router
from .agent_access_routes import router as agent_access_router
from .chat_routes import router as chat_router
from .chat_routes import status_router as chat_status_router
from .contact_draft_routes import router as contact_draft_router
from .contact_routes import router as contact_router
from .content_routes import router as content_router
from .custom_resolution import router as custom_resolution_router
from .dataplayground_routes import router as dataplayground_router
from .dataplayground_runtime_routes import router as dataplayground_runtime_router
from .discovery_routes import router as discovery_router
from .events_routes import router as events_router
from .health_routes import router as health_router
from .labs_routes import forwards_router
from .labs_routes import router as labs_router
from .resume_routes import router as resume_router
from .telemetry_routes import router as telemetry_router
from .zuni_routes import router as zuni_router

# Every public HTTP route lives under /api. Route paths do not overlap, so
# inclusion order only sets the order of the (dev-only) OpenAPI listing.
api_router = APIRouter(prefix="/api")
api_router.include_router(dataplayground_router)
api_router.include_router(dataplayground_runtime_router)
api_router.include_router(labs_router)
api_router.include_router(health_router, tags=["health"])
api_router.include_router(resume_router, tags=["resume"])
api_router.include_router(telemetry_router, tags=["telemetry"])
api_router.include_router(events_router, tags=["events"])
api_router.include_router(custom_resolution_router, tags=["custom_resolution"])
api_router.include_router(content_router)  # aboutme, skills, experience, projects
api_router.include_router(contact_router, tags=["contact"])
api_router.include_router(contact_draft_router, tags=["contact"])
api_router.include_router(zuni_router, tags=["zuni"])
api_router.include_router(chat_status_router, tags=["chat"])
api_router.include_router(agent_access_router, tags=["agent"])
api_router.include_router(admin_router, prefix="/admin", tags=["admin"])
# /llms.txt, /resume.json and friends live at the site root, not under /api.
# Appending the routes (rather than include_router, which would prefix them)
# keeps their paths as declared when main.py includes api_router.
api_router.routes.extend(discovery_router.routes)
api_router.routes.extend(forwards_router.routes)  # /<slug> 302s to apps hosted elsewhere

# The chat socket is mounted under /ws.
ws_router = APIRouter(prefix="/ws")
ws_router.include_router(chat_router, tags=["chat"])
