import os
import random
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from ..utils.logger import setup_logging

router = APIRouter()
logger = setup_logging()

# Update path to point to the correct assets location
ZUNI_DIR = Path(__file__).parent.parent.parent / "assets" / "zuni"

@router.get("/zuni")
async def get_random_zuni_image(subject_number: int | None = None):
    """Return a Zuni image file path. If subject_number is provided, returns that specific image,
    otherwise returns a random image."""
    # Missing directory should be a clean 404, not an unhandled FileNotFoundError
    if not ZUNI_DIR.is_dir():
        raise HTTPException(status_code=404, detail="No Zuni images found")

    image_files = [f for f in os.listdir(ZUNI_DIR) if f.endswith('.png')]

    if not image_files:
        raise HTTPException(status_code=404, detail="No Zuni images found")

    if subject_number is not None:
        # Try to get the specific image
        target_image = f"subject_{subject_number}.png"
        if target_image in image_files:
            image_path = ZUNI_DIR / target_image
            return FileResponse(image_path)
        else:
            raise HTTPException(status_code=404, detail=f"Image subject_{subject_number}.png not found")

    # If no subject number provided or invalid, select a random image
    random_image = random.choice(image_files)
    image_path = ZUNI_DIR / random_image

    return FileResponse(image_path)
