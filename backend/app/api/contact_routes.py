from fastapi import APIRouter, HTTPException
from ..models import Contact
from ..models.data_loader import load_contact

router = APIRouter()

@router.get("/contact", response_model=Contact)
async def get_contact() -> Contact:
    """
    Get all contact information.
    Returns Contact model with all contact details.
    """
    try:
        contact = load_contact()
        return contact
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
