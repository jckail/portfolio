from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import HTMLResponse
from typing import Optional, Tuple, Dict

router = APIRouter()

# Grouped viewports by device types
def get_known_viewports() -> Dict[str, Dict[str, Tuple[int, int]]]:
    return {
        "phones": {
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
        },
        "tablets": {
            "ipad pro 12.9": (1024, 1366),
            "ipad air 10.9": (820, 1180),
            "ipad mini 6": (744, 1133),
            "samsung galaxy tab s8": (1600, 2560),
            "microsoft surface pro 9": (1920, 1280),
        },
        "laptops": {
            "macbook air 13": (1440, 900),
            "macbook pro 16": (1536, 2048),
            "dell xps 13": (1920, 1200),
            "hp spectre x360": (1920, 1080),
            "lenovo thinkpad x1 carbon": (2560, 1440),
        },
        "desktops": {
            "4k monitor": (3840, 2160),
            "1440p monitor": (2560, 1440),
            "1080p monitor": (1920, 1080),
            "720p monitor": (1280, 720),
        },
    }

def get_default_for_device_type(device_type: str) -> Tuple[int, int]:
    """Return default width/height based on the first resolution in the given device type."""
    known_viewports = get_known_viewports()
    device_type = device_type.lower()

    # Check if the device type exists in the known viewports
    if device_type in known_viewports and known_viewports[device_type]:
        # Return the first resolution in the device type as the default
        return next(iter(known_viewports[device_type].values()))

    # Fallback to default phone size if the device type is not found
    return (375, 800)

@router.get("/custom_resolution", response_class=HTMLResponse)
async def custom_resolution(
    additional_path: Optional[str] = Query("", description="Render Other Paths on the site"),
    width: Optional[int] = Query(None, description="Window width"),
    height: Optional[int] = Query(None, description="Window height"),
    device_name: Optional[str] = Query(None, description="Device name"),
    device_type: Optional[str] = Query(None, description="Device type (e.g., phones, tablets, laptops, desktops)"),
):
    known_viewports = get_known_viewports()

    # Handle resolution based on device_name
    if device_name:
        # Search through all device types for the given name
        viewport = None
        for devices in known_viewports.values():
            if device_name.lower() in devices:
                viewport = devices[device_name.lower()]
                break
        if not viewport:
            raise HTTPException(status_code=404, detail="Device not found")
        width, height = viewport

    # Handle resolution based on device_type with default fallback
    elif device_type:
        width, height = get_default_for_device_type(device_type)

    # Use provided width and height if no device_name or device_type is given
    width = width or 375  # Default phone width
    height = height or 800  # Default phone height

    # Create device info text
    device_info = ""
    if device_name:
        device_info = f" - {device_name.title()}"
    elif device_type:
        device_info = f" - {device_type.title()}"

    src = f"/{additional_path}"

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
            .resolution-banner {{
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background-color: #007bff;
                color: white;
                padding: 8px;
                text-align: center;
                font-family: Arial, sans-serif;
                font-size: 14px;
                z-index: 10000;
                max-width: {width}px;
            }}
            iframe {{
                border: none;
                width: 100%;
                height: 100%;
                margin-top: 30px;
            }}
        </style>
    </head>
    <body>
        <div class="resolution-banner">
            Resolution: {width}x{height}{device_info}
            URL: {src}
        </div>
        <iframe src="{src}" width="{width}" height="{height}"></iframe>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)
