from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .api import api_router, ws_router
from .utils.logger import setup_logging
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
    "SUPABASE_JWT_SECRET",
    "SUPABASE_PW",
    "ANTHROPIC_API_KEY"
]

# Check environment variables without excessive logging
missing_vars = [var for var in required_env_vars if not os.getenv(var)]
if missing_vars:
    error_msg = f"Missing required environment variables: {', '.join(missing_vars)}"
    logger.error(error_msg)
    sys.exit(1)

logger.info("All required environment variables are present")

# Initialize FastAPI
app = FastAPI(
    title="jordan-kail.com API",
    description="API for the Jordan-Kail.com application",
    version="1.0.0"
)

# Configure CORS
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS", 
    "http://localhost:*,http://0.0.0.0:*,http://127.0.0.1:*"
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

@app.on_event("startup")
async def startup_event():
    """Initialize any necessary services on startup"""
    logger.info("Starting up the application...")
    try:
        # Initialize critical components first
        await initialize_supabase()
        
        # Load data and initialize static files concurrently
        await asyncio.gather(
            preload_data(),
            initialize_static_files(),
            return_exceptions=True
        )
        
        # Ensure logs directory exists
        logs_dir = os.path.join(os.path.dirname(__file__), 'logs')
        os.makedirs(logs_dir, exist_ok=True)
        
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
