
import logging

from fastapi import APIRouter, HTTPException

from ..models import SkillDetail
from ..models.data_loader import load_skills

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/skills", response_model=dict[str, SkillDetail])
async def get_all_skills() -> dict[str, SkillDetail]:
    """
    Get all skills.
    Returns dictionary of skill details mapped by skill key.
    """
    try:
        skills = load_skills()
        return skills.root
    except HTTPException as he:
        raise he
    except Exception:
        logger.exception("Failed to load skills")
        raise HTTPException(status_code=500, detail="Unable to load skills")

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
    except Exception:
        logger.exception("Failed to load skills")
        raise HTTPException(status_code=500, detail="Unable to load skills")
