from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.app.api.routes import router as api_router
import os
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get allowed origins from environment variable or use default
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:*,http://0.0.0.0:*,http://127.0.0.1:*,http://192.168.*.*:*").split(",")
allowed_origins = [origin.strip() for origin in allowed_origins]
logger.info(f"Allowed origin patterns: {allowed_origins}")

def is_origin_allowed(origin: str) -> bool:
    from fnmatch import fnmatch
    return any(fnmatch(origin, pattern) for pattern in allowed_origins)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # Use the allowed_origins list
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the API routes
app.include_router(api_router, prefix="/api")

# Serve static files (images)
images_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'images'))
app.mount("/api/images", StaticFiles(directory=images_dir), name="images")

# Define the path to the assets directory
assets_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'assets'))

# Serve resume PDF as a static file
app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

# Serve frontend static files
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'dist'))
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

# Serve index.html for all routes not matched by API or static files
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    return FileResponse(os.path.join(frontend_dir, "index.html"))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
