from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse
from ..utils.logger import setup_logging
import os
from ..models.data_loader import load_aboutme

router = APIRouter()
logger = setup_logging()


def get_resume_file_path():
    """Fetch the resume file path from aboutme data."""
    try:
        aboutme_data = load_aboutme()
        file_name = aboutme_data.resume_name
            
        if not file_name:
            logger.error("resume_name not found in aboutme data")
            raise HTTPException(
                status_code=500, detail="resume_name not found in aboutme data"
            )

        file_path = os.path.join(os.path.dirname(__file__), "..", "..", "assets", file_name)

        if not os.path.exists(file_path):
            logger.error(f"Resume file '{file_name}' not found")
            raise HTTPException(
                status_code=404, detail=f"Resume file '{file_name}' not found."
            )

        return file_path
    except Exception as e:
        logger.error(f"Error getting resume file path: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/resume")
async def serve_resume(request: Request):
    """Serve the resume file as a PDF if it exists."""
    try:
        file_path = get_resume_file_path()
        logger.info("Resume file successfully served")
        headers = {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
        # Check if this is a download request
        is_download = 'download' in request.query_params
        
        return FileResponse(
            file_path,
            media_type='application/pdf',
            headers=headers,
            filename="jordankail_resume.pdf",
            content_disposition_type='attachment' if is_download else 'inline'
        )
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
