from fastapi import APIRouter, HTTPException
from typing import Optional
from ..models.old_models.skills import skills

router = APIRouter()

@router.get("/skills")
async def get_all_skills() -> dict:
    """
    Get all skills.
    Returns a dictionary of all skills.
    """
    return skills

@router.get("/skills/{skill_name}")
async def get_skill(skill_name: str) -> dict:
    """
    Get a skill by name.
    Returns the skill details if found, otherwise raises 404.
    """
    # Convert skill name to lowercase for dictionary lookup
    skill_key = skill_name.lower()
    
    if skill_key in skills:
        return skills[skill_key]
    
    raise HTTPException(status_code=404, detail="Skill not found")
