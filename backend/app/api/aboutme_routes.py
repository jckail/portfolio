import logging

from fastapi import APIRouter, HTTPException

from ..models import AboutMe
from ..models.data_loader import load_aboutme

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/aboutme", response_model=AboutMe)
async def get_aboutme() -> AboutMe:
    """
    Get all about me information.
    Returns AboutMe model with all about me details.
    """
    try:
        about_me = load_aboutme()
        return about_me
    except HTTPException as he:
        raise he
    except Exception:
        logger.exception("Failed to load about me information")
        raise HTTPException(status_code=500, detail="Unable to load about me information")
