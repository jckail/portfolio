from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from ..utils.logger import setup_logging
from ..models.resume_data import resume_data
import os
from dotenv import load_dotenv

router = APIRouter()
logger = setup_logging()

@router.get("/resume_data")
async def get_resume():
    try:
        transformed_data = {
            "name": resume_data["name"],
            "title": resume_data["title"],
            "github": resume_data["contact"]["github"],
            "linkedin": resume_data["contact"]["linkedin"],
            "aboutMe": resume_data["about_me"],
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
        logger.info("Resume data successfully retrieved")
        return transformed_data
    except Exception as e:
        logger.error(f"Error retrieving resume data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def get_resume_file_path():
    """Fetch the resume file path, ensuring the environment variable is set and the file exists."""
    file_name = os.getenv("RESUME_FILE", None)
    if not file_name:
        logger.error("Environment variable 'RESUME_FILE' is not set")
        raise HTTPException(
            status_code=500, detail="Environment variable 'RESUME_FILE' is not set."
        )

    file_path = os.path.join(os.path.dirname(__file__), "..", "..", "assets", file_name)

    if not os.path.exists(file_path):
        logger.error(f"Resume file '{file_name}' not found")
        raise HTTPException(
            status_code=404, detail=f"Resume file '{file_name}' not found."
        )

    return file_path

@router.get("/resume")
async def serve_resume():
    """Serve the resume file as a PDF if it exists."""
    try:
        file_path = get_resume_file_path()
        logger.info("Resume file successfully served")
        return FileResponse(file_path, media_type='application/pdf')
    except Exception as e:
        logger.error(f"Error serving resume file: {str(e)}")
        raise

@router.get("/resume_file_name")
async def resume_file_name():
    """Return the resume file name if the file exists."""
    try:
        file_path = get_resume_file_path()
        logger.info("Resume filename successfully retrieved")
        return {"resumeFileName": os.path.basename(file_path)}
    except Exception as e:
        logger.error(f"Error retrieving resume filename: {str(e)}")
        raise