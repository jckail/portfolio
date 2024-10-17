from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.app.api.routes import router as api_router
import os
import logging

app = FastAPI()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get allowed origins from environment variable or use default
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://192.168.0.122:5173").split(",")
allowed_origins = [origin.strip() for origin in allowed_origins]
logger.info(f"Allowed origins: {allowed_origins}")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the API routes
app.include_router(api_router, prefix="/api")

# Serve static files (images)
images_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'images'))
app.mount("/images", StaticFiles(directory=images_dir), name="images")

# Serve frontend static files
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'dist'))
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

# Serve PDF file
@app.get("/JordanKailResume.pdf")
async def serve_pdf():
    try:
        pdf_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "assets", "JordanKailResume.pdf"))
        logger.info(f"Attempting to serve PDF from path: {pdf_path}")
        
        if os.path.exists(pdf_path):
            logger.info("PDF file found. Attempting to serve...")
            return FileResponse(pdf_path, media_type='application/pdf', filename="JordanKailResume.pdf")
        else:
            logger.error(f"PDF file not found at path: {pdf_path}")
            raise HTTPException(status_code=404, detail="PDF file not found")
    except Exception as e:
        logger.error(f"Error serving PDF: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Serve index.html for all routes not matched by API or static files
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    return FileResponse(os.path.join(frontend_dir, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8080)
