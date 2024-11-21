from fastapi import APIRouter, HTTPException
from typing import Dict
from ..models import Experience, ExperienceHighlight
from ..models.data_loader import load_experience

router = APIRouter()

@router.get("/experience", response_model=Dict[str, ExperienceHighlight])
async def get_all_experience() -> Dict[str, ExperienceHighlight]:
    """
    Get all experience entries.
    Returns dictionary of experience details mapped by company key.
    """
    try:
        experience = load_experience()
        return experience.model_dump()
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/experience/{company_key}", response_model=ExperienceHighlight)
async def get_experience(company_key: str) -> ExperienceHighlight:
    """
    Get experience by company key.
    Returns the experience details if found, otherwise raises 404.
    """
    try:
        # Convert company key to lowercase for dictionary lookup
        company_key = company_key.lower()
        
        experience = load_experience()
        experience_dict = experience.model_dump()
        
        if company_key in experience_dict:
            return experience_dict[company_key]
        
        raise HTTPException(status_code=404, detail="Experience not found")
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
