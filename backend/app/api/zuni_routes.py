import random
from functools import cache
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

router = APIRouter()

ZUNI_DIR = Path(__file__).parent.parent.parent / "assets" / "zuni"

# These are party-theme particle sprites, drawn at 60x60. They were stored as
# full-resolution PNGs (up to 3024px, 94 MB total), which shipped inside the
# runtime image and slowed cold starts for a decorative easter egg.
IMAGE_SUFFIX = ".webp"
IMAGE_MEDIA_TYPE = "image/webp"
# Content is immutable per deploy and unauthenticated; let clients keep it.
CACHE_HEADERS = {"Cache-Control": "public, max-age=86400"}


@cache
def _sprite_names(directory: Path) -> frozenset[str]:
    """Sprite filenames in ``directory``; listed once, they ship with the image."""
    if not directory.is_dir():
        return frozenset()
    return frozenset(p.name for p in directory.iterdir() if p.name.endswith(IMAGE_SUFFIX))


@router.get("/zuni", response_class=FileResponse)
async def get_random_zuni_image(
    subject: int | None = Query(None, description="Specific subject to return"),
    subject_number: int | None = Query(None, include_in_schema=False),
) -> FileResponse:
    """Return a Zuni image. With `subject`, returns that specific image;
    otherwise returns a random one.

    The parameter is `subject` because that is what the frontend has always
    sent (`/api/zuni?subject=N`). It used to be named `subject_number` only,
    so every request silently fell through to the random branch and party
    mode's three "distinct" particle layers could all draw the same image.
    The old name is still accepted so any cached client keeps working.
    """
    names = _sprite_names(ZUNI_DIR)
    if not names:
        raise HTTPException(status_code=404, detail="No Zuni images found")

    requested = subject if subject is not None else subject_number
    if requested is None:
        name = random.choice(sorted(names))
    else:
        # `requested` is an int (FastAPI coerces it) and the name must be a
        # real directory entry, so the path cannot be steered outside ZUNI_DIR.
        name = f"subject_{requested}{IMAGE_SUFFIX}"
        if name not in names:
            raise HTTPException(status_code=404, detail=f"Image {name} not found")

    return FileResponse(ZUNI_DIR / name, media_type=IMAGE_MEDIA_TYPE, headers=CACHE_HEADERS)
