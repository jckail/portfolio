import asyncio
import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from .api import api_router, ws_router
from .config import get_settings, missing_required_vars
from .models.data_loader import load_all
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
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.allowed_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
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
    request_id = set_request_id(incoming if incoming else None)
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
            elif path == "/" or path.endswith(".html"):
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

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        # Ignored over plain HTTP (local dev); effective behind Cloud Run's TLS
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        # CSP: allow self + Google Fonts/GA; GA config is inline in index.html
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "base-uri 'self'; "
            "object-src 'none'; "
            "frame-ancestors 'none'; "
            "img-src 'self' data: https:; "
            "font-src 'self' https://fonts.gstatic.com data:; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com; "
            "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com wss: ws:; "
            "frame-src 'self'; "
            "worker-src 'self' blob:; "
            "upgrade-insecure-requests"
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
            app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
            logger.info(f"Mounted frontend directory: {frontend_dir}")
    except Exception as e:
        logger.error(f"Error mounting static files: {str(e)}")
        raise

