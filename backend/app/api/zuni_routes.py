import os
import random
from fastapi import APIRouter
from fastapi.responses import FileResponse
from pathlib import Path

router = APIRouter()

ZUNI_DIR = Path(__file__).parent.parent / "assets" / "zuni"

@router.get("/api/zuni")
async def get_random_zuni_image():
    """Return a random Zuni image file path."""
    # Get list of all image files in the zuni directory
    image_files = [f for f in os.listdir(ZUNI_DIR) if f.endswith('.png')]
    
    if not image_files:
        return {"error": "No Zuni images found"}
    
    # Select a random image
    random_image = random.choice(image_files)
    image_path = ZUNI_DIR / random_image
    
    return FileResponse(image_path)
