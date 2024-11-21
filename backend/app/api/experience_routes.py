from fastapi import APIRouter, HTTPException
from typing import Optional
from ..models.old_models.experience import experience

router = APIRouter()

@router.get("/experience")
async def get_all_experience() -> dict:
    """
    Get all experience entries.
    Returns a dictionary of all professional experience.
    """
    return experience

@router.get("/experience/{company_key}")
async def get_experience(company_key: str) -> dict:
    """
    Get experience by company key.
    Returns the experience details if found, otherwise raises 404.
    """
    # Convert company key to lowercase for dictionary lookup
    company_key = company_key.lower()
    
    if company_key in experience:
        return experience[company_key]
    
    raise HTTPException(status_code=404, detail="Experience not found")
