from fastapi import FastAPI
from fastapi.responses import FileResponse
from .resume_data import resume_data
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI()

@app.get("/")
async def read_root():
    return {"message": "Welcome to Jordan Kail's Resume API"}


##TODO: Add a route to get the resume data


@app.get("/resume")
async def get_resume():
    return resume_data

@app.get("/resume/{section}")
async def get_resume_section(section: str):
    if section in resume_data:
        return resume_data[section]
    return {"error": "Section not found"}

@app.get("/download_resume")
async def download_resume():
    file_path = os.path.join(os.path.dirname(__file__), "assets", "JordanKailResume.pdf")
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type='application/pdf', filename="JordanKailResume.pdf")
    return {"error": "Resume file not found"}


app.mount("/images", StaticFiles(directory="/app/images"), name="images")
