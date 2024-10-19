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

# @router.get("/download_resume")
# async def download_resume():
#     file_path = os.path.join(os.path.dirname(__file__), "..", "..", "assets", "JordanKailResume.pdf")
#     if os.path.exists(file_path):
#         return FileResponse(file_path, media_type='application/pdf', filename="JordanKailResume.pdf")
#     raise HTTPException(status_code=404, detail="Resume file not found")


# # Serve PDF file
# @router.get("/JordanKailResume.pdf")
# async def serve_pdf():
#     try:
#         pdf_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "assets", "JordanKailResume.pdf"))
#         #logger.info(f"Attempting to serve PDF from path: {pdf_path}")
        
#         if os.path.exists(pdf_path):
#             #logger.info("PDF file found. Attempting to serve...")
#             return FileResponse(pdf_path, media_type='application/pdf', filename="JordanKailResume.pdf")
#         else:
#             #logger.error(f"PDF file not found at path: {pdf_path}")
#             raise HTTPException(status_code=404, detail="PDF file not found")
#     except Exception as e:
#         #logger.error(f"Error serving PDF: {str(e)}")
#         raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/resume")
async def serve_resume():
    file_path = os.path.join(os.path.dirname(__file__), "..", "..", "assets", "JordanKailResume.pdf")
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type='application/pdf')
    raise HTTPException(status_code=404, detail="Resume file not found")
