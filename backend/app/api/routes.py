from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from backend.app.models.resume_data import resume_data
import os

router = APIRouter()

@router.get("/resume_data")
async def get_resume():
    transformed_data = {
        "name": resume_data["name"],
        "title": resume_data["title"],
        "github": resume_data["contact"]["github"],
        "linkedin": resume_data["contact"]["linkedin"],
        "aboutMe": resume_data["about_me"],  # Use the correct key with space
        "technicalSkills": resume_data["skills"],
        "experience": [
            {
                "title": job["title"],
                "company": job["company"],
                "date": job["date"],
                "responsibilities": job["highlights"],
                "link": job["link"]
            }
            for job in resume_data["experience"]
        ],
        "projects": resume_data["projects"]
    }
    return transformed_data




@router.get("/resume")
async def serve_resume():
    file_path = os.path.join(os.path.dirname(__file__), "..", "..", "assets", "JordanKailResume.pdf")
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type='application/pdf')
    raise HTTPException(status_code=404, detail="Resume file not found")
