from fastapi import APIRouter
from ..models.contact import contact

router = APIRouter()

@router.get("/contact")
async def get_contact() -> dict:
    """
    Get all contact information.
    Returns a dictionary of all contact details.
    """
    return contact
