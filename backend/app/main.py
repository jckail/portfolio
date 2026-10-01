import asyncio
import os
import re
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from .api import api_router, ws_router
from .config import get_settings, missing_required_vars
from .models.data_loader import load_all
from .spa import SPAStaticFiles
from .utils.logger import get_supabase_handler, setup_logging
from .utils.request_context import clear_request_id, set_request_id
from .utils.supabase_client import supabase

# Configure logging
logger = setup_logging()

# Fail fast on misconfigured deployments
missing_vars = missing_required_vars()
if missing_vars:
    error_msg = f"Missing required environment variables: {', '.join(missing_vars)}"
    logger.error(error_msg)
    sys.exit(1)

logger.info("All required environment variables are present")

settings = get_settings()

# Routes that must never carry a public cache directive. `/api/admin` and
# `/api/logs` are admin-authenticated and per-user; `/api/health*` backs the
# container probe and the external uptime check, where a cached result is
# actively harmful.
PRIVATE_API_PREFIXES = ("/api/admin", "/api/logs")
NEVER_CACHE_PREFIXES = ("/api/health",)
# Scripts served from the dist root without a content hash in the filename.
UNHASHED_SCRIPTS = frozenset({"/ga-init.js"})

# A client-supplied X-Request-ID is echoed in the response and stamped on
# every log line, so only accept short, boring values; anything else gets a
# fresh server-generated ID.
REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._-]{8,64}$")

# The resume PDF is shown in a same-origin <iframe> (PDFViewer), so it is the
# one response allowed to be framed, and only by this site.
FRAMEABLE_PATHS = ("/api/resume",)


def _websocket_origins() -> str:
    """wss:// equivalents of the deployed HTTPS origins.

    CSP Level 3 lets 'self' match same-host wss://, but older Safari does not,
    so the production hosts are listed explicitly for the chat socket.
    """
    origins = [*settings.allowed_origins, settings.production_url]
    hosts = {
        "wss://" + origin[len("https://"):].rstrip("/")
        for origin in origins
        if origin.startswith("https://")
    }
    return "".join(f" {host}" for host in sorted(hosts))


GA_SCRIPT_SOURCES = "https://www.googletagmanager.com https://www.google-analytics.com"
GA_CONNECT_SOURCES = (
    "https://www.google-analytics.com https://*.google-analytics.com "
    "https://*.analytics.google.com https://www.googletagmanager.com"
)


def build_csp(frame_ancestors: str = "'none'") -> str:
    """Content-Security-Policy for every response.

    No 'unsafe-inline' in script-src: the GA bootstrap lives in
    /ga-init.js, and the JSON-LD block in index.html is a data block the
    browser never executes. style-src keeps 'unsafe-inline' for Emotion/MUI
    and the inline @font-face block in index.html. Fonts are self-hosted
    under /fonts/, so no Google Fonts origins are allowed.
    """
    return (
        "default-src 'self'; "
        "base-uri 'self'; "
        "object-src 'none'; "
        "form-action 'self'; "
        f"frame-ancestors {frame_ancestors}; "
        "img-src 'self' data: https:; "
        "font-src 'self' data:; "
        "style-src 'self' 'unsafe-inline'; "
        f"script-src 'self' {GA_SCRIPT_SOURCES}; "
        f"connect-src 'self' {GA_CONNECT_SOURCES}{_websocket_origins()}; "
        "frame-src 'self'; "
        "worker-src 'self' blob:; "
        "upgrade-insecure-requests"
    )


CSP_DEFAULT = build_csp()
CSP_FRAMEABLE = build_csp("'self'")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown."""
    logger.info("Starting up the application...")

    # Start shipping buffered logs to Supabase now that the event loop exists
    supabase_handler = get_supabase_handler()
    if supabase_handler is not None:
        supabase_handler.start()

    try:
        # Initialize critical components first
        await initialize_supabase()

        # Load data and initialize static files concurrently; surface any failure
        results = await asyncio.gather(
            preload_data(),
            initialize_static_files(),
            return_exceptions=True
        )
        for result in results:
            if isinstance(result, BaseException):
                raise result

        # Ensure logs directory exists
        logs_dir = os.path.join(os.path.dirname(__file__), 'logs')
        os.makedirs(logs_dir, exist_ok=True)

        logger.info(f"Configured to run on port: {settings.port}")

    except Exception as e:
        logger.error(f"Startup error: {str(e)}")
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

# Compress API/static responses larger than 1 KB
app.add_middleware(GZipMiddleware, minimum_size=1024)


@app.middleware("http")
async def add_response_headers(request: Request, call_next):
    """Attach request ID, cache policies, and security headers.

    Vite emits content-hashed filenames under /assets/, so those files can be
    cached forever. Images are unhashed, so they get a shorter TTL. HTML must
    always be revalidated so deploys take effect immediately.
    """
    incoming = request.headers.get("x-request-id")
    if not (incoming and REQUEST_ID_PATTERN.match(incoming)):
        incoming = None
    request_id = set_request_id(incoming)
    request.state.request_id = request_id

    try:
        response = await call_next(request)

        response.headers["X-Request-ID"] = request_id

        if "cache-control" not in response.headers:
            path = request.url.path
            if path.startswith("/assets/"):
                response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
            elif path.startswith(("/images/", "/api/assets/")):
                response.headers["Cache-Control"] = "public, max-age=86400"
            elif (
                path == "/"
                or path.endswith(".html")
                or path in UNHASHED_SCRIPTS
                # SPA history fallback: /admin and unknown paths get index.html
                or response.headers.get("content-type", "").startswith("text/html")
            ):
                # Unhashed root scripts (the GA consent bootstrap) revalidate
                # like the HTML that loads them; otherwise browsers cache them
                # heuristically and keep running a stale consent default.
                response.headers["Cache-Control"] = "no-cache"
            elif path.startswith(NEVER_CACHE_PREFIXES):
                # Health must never be served from a cache. A stale "healthy"
                # 200 held by any intermediary would hide a real outage from
                # the external uptime check for the life of the entry.
                response.headers["Cache-Control"] = "no-store"
            elif (
                path.startswith("/api/")
                and request.method == "GET"
                and response.status_code == 200
                and not path.startswith(PRIVATE_API_PREFIXES)
            ):
                # Portfolio content is static JSON loaded from disk, but five
                # of these gate the first render. A short TTL with a longer
                # stale window keeps repeat visits and refreshes off the
                # critical path without making edits slow to appear.
                #
                # Restricted to 200s so 4xx/5xx are never cached, and to the
                # public content routes: anything requiring authentication is
                # per-user and must not land in a shared cache.
                response.headers["Cache-Control"] = (
                    "public, max-age=60, stale-while-revalidate=300"
                )

        frameable = request.url.path in FRAMEABLE_PATHS
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN" if frameable else "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        # Ignored over plain HTTP (local dev); effective behind Cloud Run's TLS
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = (
            CSP_FRAMEABLE if frameable else CSP_DEFAULT
        )
        return response
    finally:
        clear_request_id()

# Mount API routes first
app.include_router(api_router)
app.include_router(ws_router)

async def initialize_supabase():
    """Initialize Supabase connection"""
    try:
        # Force initialization of Supabase clients
        supabase.initialize_config()
        supabase.get_client()
        supabase.get_admin_client()
        logger.info("Supabase clients initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase: {str(e)}")
        raise

async def preload_data():
    """Preload all data into cache"""
    try:
        await asyncio.to_thread(load_all)
        logger.info("Data preloaded successfully")
    except Exception as e:
        logger.error(f"Failed to preload data: {str(e)}")
        raise

async def initialize_static_files():
    """Initialize static file mounting"""
    try:
        # Serve static files (images)
        # images_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'images'))
        # logger.info(f"Images directory path: {images_dir}")
        # if not os.path.exists(images_dir):
        #     logger.warning(f"Images directory does not exist: {images_dir}")
        # app.mount("/api/images", StaticFiles(directory=images_dir), name="images")

        # Define the path to the assets directory
        assets_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'assets'))
        if os.path.exists(assets_dir):
            app.mount("/api/assets", StaticFiles(directory=assets_dir), name="assets")
            logger.info(f"Mounted assets directory: {assets_dir}")

        # Serve frontend static files
        frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'dist'))
        if os.path.exists(frontend_dir):
            app.mount("/", SPAStaticFiles(directory=frontend_dir, html=True), name="frontend")
            logger.info(f"Mounted frontend directory: {frontend_dir}")
    except Exception as e:
        logger.error(f"Error mounting static files: {str(e)}")
        raise

