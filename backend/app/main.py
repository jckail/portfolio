from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.app.api.routes import router as api_router
from backend.app.api.admin_routes import router as admin_router
import os
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Verify required environment variables
required_env_vars = [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "ADMIN_EMAIL",
]

missing_vars = [var for var in required_env_vars if not os.getenv(var)]
if missing_vars:
    raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

app = FastAPI()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(os.path.dirname(__file__), 'logs', 'app.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Get allowed origins from environment variable or use default
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS", 
    "http://localhost:*,http://0.0.0.0:*,http://127.0.0.1:*"
).split(",")
allowed_origins = [origin.strip() for origin in allowed_origins]
logger.info(f"Allowed origin patterns: {allowed_origins}")

def is_origin_allowed(origin: str) -> bool:
    from fnmatch import fnmatch
    return any(fnmatch(origin, pattern) for pattern in allowed_origins)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
    expose_headers=["*"]  # Expose all headers
)

# Mount the API routes
app.include_router(api_router, prefix="/api")
app.include_router(admin_router, prefix="/api/admin", tags=["admin"])

# Serve static files (images)
images_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'images'))
app.mount("/api/images", StaticFiles(directory=images_dir), name="images")

# Define the path to the assets directory
assets_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'assets'))
app.mount("/api/assets", StaticFiles(directory=assets_dir), name="assets")

# Serve frontend static files
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'dist'))
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

# Serve index.html for all routes not matched by API or static files
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    return FileResponse(os.path.join(frontend_dir, "index.html"))

@app.on_event("startup")
async def startup_event():
    """
    Initialize any necessary services on startup
    """
    logger.info("Starting up the application...")
    # Ensure logs directory exists
    os.makedirs(os.path.join(os.path.dirname(__file__), 'logs'), exist_ok=True)

@app.on_event("shutdown")
async def shutdown_event():
    """
    Clean up any resources on shutdown
    """
    logger.info("Shutting down the application...")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )
