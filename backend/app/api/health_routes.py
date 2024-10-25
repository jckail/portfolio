from fastapi import APIRouter
from ..utils.logger import setup_logging

router = APIRouter()
logger = setup_logging()

@router.get("/health")
async def health_check():
    """Check if the service is healthy"""
    return {"status": "healthy", "message": "Service is running"}
