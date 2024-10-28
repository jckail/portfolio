import os
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import HTMLResponse
from typing import Optional, Tuple, Dict

router = APIRouter()

# Load BASE_URL from environment or default to localhost for local development
BASE_URL = os.getenv("BASE_URL", "http://localhost:5173")

def get_known_viewports() -> Dict[str, Tuple[int, int]]:
    return {
        "iphone 16 pro": (402, 874),
        "iphone 15 pro": (393, 852),
        "iphone 14": (390, 844),
        "samsung galaxy s23": (412, 915),
        "samsung galaxy z fold 5 (folded)": (384, 846),
        "google pixel 8": (412, 915),
        "google pixel 7a": (412, 892),
        "oneplus 11": (412, 933),
        "xiaomi 13 pro": (412, 919),
        "samsung galaxy a54": (412, 915),
        "iphone se (3rd gen)": (375, 667),
        "iphone 13 mini": (375, 812),
        "samsung galaxy z flip 5 (folded)": (412, 919),
    }

@router.get("/custom_resolution", response_class=HTMLResponse)
async def custom_resolution(
    width: Optional[int] = Query(None, description="Window width"),
    height: Optional[int] = Query(None, description="Window height"),
    device_name: Optional[str] = Query(None, description="Device name"),
):
    known_viewports = get_known_viewports()

    if device_name:
        viewport = known_viewports.get(device_name.lower())
        if not viewport:
            raise HTTPException(status_code=404, detail="Device not found")
        width, height = viewport

    width = width or 375
    height = height or 800

    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width={width}, height={height}, initial-scale=1.0">
        <title>{width} by {height}</title>
        <style>
            body, html {{
                margin: 0;
                padding: 0;
                width: {width}px;
                height: {height}px;
                overflow: hidden;
            }}
            iframe {{
                border: none;
                width: 100%;
                height: 100%;
            }}
        </style>
    </head>
    <body>
        <iframe src="/" width="{width}" height="{height}"></iframe>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)
