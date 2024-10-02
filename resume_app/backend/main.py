from fastapi import FastAPI
from .resume_data import resume_data

app = FastAPI()

@app.get("/")
async def read_root():
    return {"message": "Welcome to Jordan Kail's Resume API"}

@app.get("/resume")
async def get_resume():
    return resume_data

@app.get("/resume/{section}")
async def get_resume_section(section: str):
    if section in resume_data:
        return resume_data[section]
    return {"error": "Section not found"}