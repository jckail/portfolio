from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.app.models.resume_data import resume_data
from backend.app.api.routes import router as api_router
import os

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Allow the frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/")
async def read_root():
    return {"message": "Welcome to Jordan Kail's Resume API"}

# Updated line to use the correct absolute path
images_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'images'))
app.mount("/images", StaticFiles(directory=images_dir), name="images")

# Print the path for debugging
print(f"Images directory path: {images_dir}")
