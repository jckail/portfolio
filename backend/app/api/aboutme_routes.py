from fastapi import APIRouter, Response
from ..models.old_models.aboutme import about_me
from fastapi.responses import JSONResponse

router = APIRouter()

@router.get("/aboutme")
async def get_aboutme() -> Response:
    """
    Get all about me information.
    Returns a dictionary of all about me details with caching headers.
    """
    headers = {
        "Cache-Control": "public, max-age=3600",  # Cache for 1 hour
        "Vary": "Accept-Encoding"
    }
    
    return JSONResponse(
        content=about_me,
        headers=headers
    )
