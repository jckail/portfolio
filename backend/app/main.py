import asyncio
import logging
import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .api import api_router, content, ws_router
from .config import get_settings, missing_required_vars
from .middleware.access_log import AccessLogMiddleware
from .middleware.canonical_host import CanonicalHostMiddleware
from .middleware.compression import GZIP_MINIMUM_SIZE, SelectiveGZipMiddleware
from .middleware.response_headers import ResponseHeadersMiddleware
from .spa import SPAStaticFiles
from .utils.logger import get_supabase_handler, setup_logging
from .utils.supabase_client import supabase

# Configure logging
logger = setup_logging()
# Uvicorn's plain-text access lines duplicate Cloud Run's request log and the
# structured access line below, and carry no severity or trace.
logging.getLogger("uvicorn.access").disabled = True

# Fail fast on misconfigured deployments
missing_vars = missing_required_vars()
if missing_vars:
    logger.error("Missing required environment variables: %s", ", ".join(missing_vars))
    sys.exit(1)

logger.info("All required environment variables are present")

settings = get_settings()

APP_DIR = os.path.dirname(__file__)
ASSETS_DIR = os.path.abspath(os.path.join(APP_DIR, "..", "assets"))
FRONTEND_DIST = os.path.abspath(os.path.join(APP_DIR, "..", "..", "frontend", "dist"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown."""
    logger.info("Starting up the application...")

    # Start shipping buffered logs to Supabase now that the event loop exists
    supabase_handler = get_supabase_handler()
    if supabase_handler is not None:
        supabase_handler.start()

    try:
        initialize_supabase()
        # Parse, serialize and gzip the portfolio content once, off the loop.
        await asyncio.to_thread(content.warm)
        logger.info("Data preloaded successfully")
        frontend = mount_static_files()
        if frontend is not None:
            await asyncio.to_thread(frontend.warm_gzip_cache)
        logger.info("Configured to run on port: %s", settings.port)
    except Exception:
        logger.exception("Startup error")
        raise

    yield

    logger.info("Shutting down the application...")
    if supabase_handler is not None:
        await supabase_handler.stop()


# Initialize FastAPI
app = FastAPI(
    title="jordan-kail.com API",
    description="API for the Jordan-Kail.com application",
    version="1.0.0",
    lifespan=lifespan,
    # The schema publishes the admin route map, and Swagger's CDN assets are
    # blocked by our own CSP anyway, so the docs exist only in dev mode.
    docs_url="/docs" if settings.dev_mode else None,
    redoc_url="/redoc" if settings.dev_mode else None,
    openapi_url="/openapi.json" if settings.dev_mode else None,
)

# Starlette runs the last-added middleware outermost: the access log wraps
# response headers, which wrap compression, which wraps CORS.
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.allowed_origins),
    # Admin auth is a Bearer header, not a cookie, so credentialed CORS is
    # never needed.
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Request-ID"],
    expose_headers=["X-Request-ID"]
)
app.add_middleware(SelectiveGZipMiddleware, minimum_size=GZIP_MINIMUM_SIZE)
app.add_middleware(CanonicalHostMiddleware, settings=settings)  # opt-in; no-op unless ALIAS_HOSTS is set
app.add_middleware(ResponseHeadersMiddleware, settings=settings)
# Outermost: sets the Cloud Trace context for every log line the request
# produces and writes the one structured access-log line.
app.add_middleware(AccessLogMiddleware, settings=settings)

# Mount API routes first; the SPA mount at "/" is added at startup.
app.include_router(api_router)
app.include_router(ws_router)


def initialize_supabase() -> None:
    """Build both Supabase clients now so a bad config fails the boot."""
    try:
        supabase.initialize_config()
        supabase.get_client()
        supabase.get_admin_client()
        logger.info("Supabase clients initialized successfully")
    except Exception:
        logger.exception("Failed to initialize Supabase")
        raise


def mount_static_files() -> SPAStaticFiles | None:
    """Mount party sprites/resume assets and the built SPA, when present."""
    if os.path.exists(ASSETS_DIR):
        app.mount("/api/assets", StaticFiles(directory=ASSETS_DIR), name="assets")
        logger.info("Mounted assets directory: %s", ASSETS_DIR)

    if not os.path.exists(FRONTEND_DIST):
        return None
    frontend = SPAStaticFiles(directory=FRONTEND_DIST, html=True, bootstrap=content.bootstrap_json)
    app.mount("/", frontend, name="frontend")
    logger.info("Mounted frontend directory: %s", FRONTEND_DIST)
    return frontend
