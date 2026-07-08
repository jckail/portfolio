from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from .api import api_router, ws_router
from .utils.logger import setup_logging, get_supabase_handler
from .models.data_loader import load_all
from .utils.supabase_client import supabase
import os
from dotenv import load_dotenv
import sys
import asyncio

# Configure logging
logger = setup_logging()

# Load environment variables
load_dotenv()

# Verify required environment variables
required_env_vars = [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE",
    "ALLOWED_ORIGINS",
    "PRODUCTION_URL",
    "PORT",
    "ADMIN_EMAIL",
    "RESUME_FILE",
    "ANTHROPIC_API_KEY",
    "SENDGRID_API_KEY"
]

# Check environment variables without excessive logging
missing_vars = [var for var in required_env_vars if not os.getenv(var)]
if missing_vars:
    error_msg = f"Missing required environment variables: {', '.join(missing_vars)}"
    logger.error(error_msg)
    sys.exit(1)

logger.info("All required environment variables are present")

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

        # Log the port we're trying to use
        port = os.getenv('PORT', '8080')
        logger.info(f"Configured to run on port: {port}")

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

# Configure CORS. Starlette requires exact origin strings, so the default
# lists the common local dev servers explicitly (wildcard ports never match).
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080"
).split(",")
allowed_origins = [origin.strip() for origin in allowed_origins]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Compress API/static responses larger than 1 KB
app.add_middleware(GZipMiddleware, minimum_size=1024)


@app.middleware("http")
async def add_cache_headers(request: Request, call_next):
    """Set cache policies for static content.

    Vite emits content-hashed filenames under /assets/, so those files can be
    cached forever. Images are unhashed, so they get a shorter TTL. HTML must
    always be revalidated so deploys take effect immediately.
    """
    response = await call_next(request)
    if "cache-control" not in response.headers:
        path = request.url.path
        if path.startswith("/assets/"):
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        elif path.startswith(("/images/", "/api/assets/")):
            response.headers["Cache-Control"] = "public, max-age=86400"
        elif path == "/" or path.endswith(".html"):
            response.headers["Cache-Control"] = "no-cache"
    return response

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

