import os
import random
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from ..utils.logger import setup_logging

router = APIRouter()
logger = setup_logging()

# Update path to point to the correct assets location
ZUNI_DIR = Path(__file__).parent.parent.parent / "assets" / "zuni"

# These are party-theme particle sprites, drawn at 60x60. They were stored as
# full-resolution PNGs (up to 3024px, 94 MB total), which shipped inside the
# runtime image and slowed cold starts for a decorative easter egg.
IMAGE_SUFFIX = ".webp"
IMAGE_MEDIA_TYPE = "image/webp"
# Content is immutable per deploy and unauthenticated; let clients keep it.
CACHE_HEADERS = {"Cache-Control": "public, max-age=86400"}


@router.get("/zuni")
async def get_random_zuni_image(
    subject: int | None = Query(None, description="Specific subject to return"),
    subject_number: int | None = Query(None, include_in_schema=False),
):
    """Return a Zuni image. With `subject`, returns that specific image;
    otherwise returns a random one.

    The parameter is `subject` because that is what the frontend has always
    sent (`/api/zuni?subject=N`). It used to be named `subject_number` only,
    so every request silently fell through to the random branch and party
    mode's three "distinct" particle layers could all draw the same image.
    The old name is still accepted so any cached client keeps working.
    """
    subject_number = subject if subject is not None else subject_number
    # Missing directory should be a clean 404, not an unhandled FileNotFoundError
    if not ZUNI_DIR.is_dir():
        raise HTTPException(status_code=404, detail="No Zuni images found")

    image_files = [f for f in os.listdir(ZUNI_DIR) if f.endswith(IMAGE_SUFFIX)]

    if not image_files:
        raise HTTPException(status_code=404, detail="No Zuni images found")

    if subject_number is not None:
        # Try to get the specific image. `subject_number` is coerced to int by
        # FastAPI and the result must still be a real directory entry, so the
        # filename cannot be steered outside ZUNI_DIR.
        target_image = f"subject_{subject_number}{IMAGE_SUFFIX}"
        if target_image in image_files:
            image_path = ZUNI_DIR / target_image
            return FileResponse(image_path, media_type=IMAGE_MEDIA_TYPE, headers=CACHE_HEADERS)
        else:
            raise HTTPException(
                status_code=404, detail=f"Image subject_{subject_number}{IMAGE_SUFFIX} not found"
            )

    # If no subject number provided or invalid, select a random image
    random_image = random.choice(image_files)
    image_path = ZUNI_DIR / random_image

    return FileResponse(image_path, media_type=IMAGE_MEDIA_TYPE, headers=CACHE_HEADERS)
