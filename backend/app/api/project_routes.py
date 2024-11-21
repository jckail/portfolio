from fastapi import APIRouter, HTTPException
from typing import Dict
from ..models import Projects, ProjectDetail
from ..models.data_loader import load_projects

router = APIRouter()

@router.get("/projects", response_model=Dict[str, ProjectDetail])
async def get_all_projects() -> Dict[str, ProjectDetail]:
    """
    Get all project entries.
    Returns dictionary of project details mapped by project key.
    """
    try:
        projects = load_projects()
        return projects.model_dump()
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/projects/{project_key}", response_model=ProjectDetail)
async def get_project(project_key: str) -> ProjectDetail:
    """
    Get project by project key.
    Returns the project details if found, otherwise raises 404.
    """
    try:
        # Convert project key to lowercase for dictionary lookup
        project_key = project_key.lower()
        
        projects = load_projects()
        projects_dict = projects.model_dump()
        
        if project_key in projects_dict:
            return projects_dict[project_key]
        
        raise HTTPException(status_code=404, detail="Project not found")
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
