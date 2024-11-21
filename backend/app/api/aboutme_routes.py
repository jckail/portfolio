from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from ..models import AboutMe
from ..models.data_loader import load_aboutme

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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
