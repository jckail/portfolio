from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from .resume_data import resume_data
from fastapi.staticfiles import StaticFiles
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

@app.get("/")
async def read_root():
    return {"message": "Welcome to Jordan Kail's Resume API"}

@app.get("/api/resume_data")
async def get_resume():
    transformed_data = {
        "name": resume_data["name"],
        "title": resume_data["title"],
        "github": resume_data["contact"]["github"],
        "linkedin": resume_data["contact"]["linkedin"],
        "technicalSkills": resume_data["skills"],  # Return the skills as a structured object
        "experience": [
            {
                "title": job["title"],
                "company": job["company"],
                "date": job["date"],
                "responsibilities": job["highlights"]
            }
            for job in resume_data["experience"]
        ],
        "projects": resume_data["projects"]
    }
    return transformed_data

@app.get("/api/download_resume")
async def download_resume():
    file_path = os.path.join(os.path.dirname(__file__), "assets", "JordanKailResume.pdf")
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type='application/pdf', filename="JordanKailResume.pdf")
    return {"error": "Resume file not found"}

@app.get("/api/resume")
async def serve_resume():
    file_path = os.path.join(os.path.dirname(__file__), "assets", "JordanKailResume.pdf")
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type='application/pdf')
    return {"error": "Resume file not found"}

# Updated line to use the correct absolute path
images_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'images'))
app.mount("/images", StaticFiles(directory=images_dir), name="images")

# Print the path for debugging
print(f"Images directory path: {images_dir}")
