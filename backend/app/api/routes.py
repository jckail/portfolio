from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from backend.app.models.resume_data import resume_data
import os
from dotenv import load_dotenv
from fastapi import Request
import json
from datetime import datetime

# Load environment variables
load_dotenv()
router = APIRouter()

def get_log_file_path():
    """Get the current log file path based on timestamp"""
    now = datetime.utcnow()
    log_dir = os.path.join(os.path.dirname(__file__), "../logs")
    
    # Ensure logs directory exists
    os.makedirs(log_dir, exist_ok=True)
    
    # Create filename with timestamp
    filename = f"frontend_{now.strftime('%Y_%m_%d_%H')}.logs"
    return os.path.join(log_dir, filename)

@router.get("/resume_data")
async def get_resume():
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
    return transformed_data

@router.post("/log")
async def log_message(request: Request):
    """Log messages from the frontend to timestamped log files"""
    try:
        body = await request.json()
        message = body.get("message", "")
        log_file_path = get_log_file_path()
        
        # Add timestamp if not present
        if not message.startswith('[20'):  # Check if timestamp is already present
            timestamp = datetime.utcnow().isoformat() + 'Z'
            message = f'[{timestamp}] {message}'
        
        # Ensure message ends with newline
        if not message.endswith('\n'):
            message += '\n'
            
        # Append message to log file
        with open(log_file_path, "a", encoding='utf-8') as f:
            f.write(message)
        
        return {"status": "success", "message": "Log written successfully"}
    except Exception as e:
        # Log the error but don't fail the request
        error_message = f"[{datetime.utcnow().isoformat()}Z] [ERROR] Logging failed: {str(e)}\n"
        try:
            with open(get_log_file_path(), "a", encoding='utf-8') as f:
                f.write(error_message)
        except:
            pass
        return {"status": "error", "message": str(e)}

def get_resume_file_path():
    """Fetch the resume file path, ensuring the environment variable is set and the file exists."""
    file_name = os.getenv("RESUME_FILE", None)
    if not file_name:
        raise HTTPException(
            status_code=500, detail="Environment variable 'RESUME_FILE' is not set."
        )

    file_path = os.path.join(os.path.dirname(__file__), "..", "..", "assets", file_name)

    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404, detail=f"Resume file '{file_name}' not found."
        )

    return file_path

@router.get("/resume")
async def serve_resume():
    """Serve the resume file as a PDF if it exists."""
    file_path = get_resume_file_path()
    return FileResponse(file_path, media_type='application/pdf')

@router.get("/resume_file_name")
async def resume_file_name():
    """Return the resume file name if the file exists."""
    file_path = get_resume_file_path()
    return {"resumeFileName": os.path.basename(file_path)}
