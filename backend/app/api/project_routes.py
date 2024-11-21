from fastapi import APIRouter, HTTPException
from typing import Optional
from ..models.old_models.projects import projects

router = APIRouter()

@router.get("/projects")
async def get_all_projects() -> dict:
    """
    Get all project entries.
    Returns a dictionary of all projects.
    """
    return projects

@router.get("/projects/{project_key}")
async def get_project(project_key: str) -> dict:
    """
    Get project by project key.
    Returns the project details if found, otherwise raises 404.
    """
    # Convert project key to lowercase for dictionary lookup
    project_key = project_key.lower()
    
    if project_key in projects:
        return projects[project_key]
    
    raise HTTPException(status_code=404, detail="Project not found")
