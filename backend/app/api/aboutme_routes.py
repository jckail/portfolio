from fastapi import APIRouter
from ..models.aboutme import about_me

router = APIRouter()

@router.get("/aboutme")
async def get_aboutme() -> dict:
    """
    Get all about me information.
    Returns a dictionary of all about me details.
    """
    return about_me
