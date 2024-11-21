from fastapi import APIRouter, HTTPException
from typing import Dict
from ..models import Skills, SkillDetail
from ..models.data_loader import load_skills

router = APIRouter()

@router.get("/skills", response_model=Dict[str, SkillDetail])
async def get_all_skills() -> Dict[str, SkillDetail]:
    """
    Get all skills.
    Returns dictionary of skill details mapped by skill key.
    """
    try:
        skills = load_skills()
        return skills.root
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/skills/{skill_name}", response_model=SkillDetail)
async def get_skill(skill_name: str) -> SkillDetail:
    """
    Get a skill by name.
    Returns the skill details if found, otherwise raises 404.
    """
    try:
        # Convert skill name to lowercase for dictionary lookup
        skill_key = skill_name.lower()
        
        skills = load_skills()
        if skill_key in skills.root:
            return skills.root[skill_key]
        
        raise HTTPException(status_code=404, detail="Skill not found")
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
