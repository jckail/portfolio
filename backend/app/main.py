from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .api.routes import router as api_router
from .api.zuni_routes import router as zuni_router
from .api.chat_routes import router as chat_router
from .utils.logger import setup_logging
import os
from dotenv import load_dotenv
import sys

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
    "SUPABASE_JWT_SECRET",
    "SUPABASE_PW",
    "ANTHROPIC_API_KEY"
]

# Log all environment variables (excluding sensitive ones)
logger.info("Checking environment variables...")
for key in os.environ:
    if not any(sensitive in key.lower() for sensitive in ['key', 'password', 'secret', 'token']):
        logger.info(f"ENV: {key}={os.environ[key]}")

missing_vars = [var for var in required_env_vars if not os.getenv(var)]
if missing_vars:
    error_msg = f"Missing required environment variables: {', '.join(missing_vars)}"
    logger.error(error_msg)
    sys.exit(1)

logger.info("All required environment variables are present")

# Initialize FastAPI
app = FastAPI(
    title="QuickResume API",
    description="API for the QuickResume application",
    version="1.0.0"
)

# Configure CORS
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS", 
    "http://localhost:*,http://0.0.0.0:*,http://127.0.0.1:*"
).split(",")
allowed_origins = [origin.strip() for origin in allowed_origins]
logger.info(f"Allowed origin patterns: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # Use the configured allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Mount API routes
app.include_router(api_router, prefix="/api")
app.include_router(zuni_router)  # Added Zuni router
app.include_router(chat_router)  # Added Chat router

# Mount static files
try:
    # Serve static files (images)
    images_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'images'))
    logger.info(f"Images directory path: {images_dir}")
    if not os.path.exists(images_dir):
        logger.warning(f"Images directory does not exist: {images_dir}")
    app.mount("/api/images", StaticFiles(directory=images_dir), name="images")

    # Define the path to the assets directory
    assets_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'assets'))
    logger.info(f"Assets directory path: {assets_dir}")
    if not os.path.exists(assets_dir):
        logger.warning(f"Assets directory does not exist: {assets_dir}")
    app.mount("/api/assets", StaticFiles(directory=assets_dir), name="assets")

    # Serve frontend static files
    frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'dist'))
    logger.info(f"Frontend directory path: {frontend_dir}")
    if not os.path.exists(frontend_dir):
        logger.warning(f"Frontend directory does not exist: {frontend_dir}")
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
except Exception as e:
    logger.error(f"Error mounting static files: {str(e)}")
    raise

# Serve index.html for all routes not matched by API or static files
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'dist'))
    return FileResponse(os.path.join(frontend_dir, "index.html"))

@app.on_event("startup")
async def startup_event():
    """Initialize any necessary services on startup"""
    logger.info("Starting up the application...")
    try:
        # Ensure logs directory exists
        logs_dir = os.path.join(os.path.dirname(__file__), 'logs')
        os.makedirs(logs_dir, exist_ok=True)
        logger.info(f"Logs directory ensured at: {logs_dir}")
        
        # Log the port we're trying to use
        port = os.getenv('PORT', '8080')
        logger.info(f"Configured to run on port: {port}")
        
    except Exception as e:
        logger.error(f"Startup error: {str(e)}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up any resources on shutdown"""
    logger.info("Shutting down the application...")
