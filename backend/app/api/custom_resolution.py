from fastapi import APIRouter, Query
from fastapi.responses import HTMLResponse
from typing import Optional

router = APIRouter()

@router.get("/custom_resolution", response_class=HTMLResponse)
async def custom_resolution(
    width: Optional[int] = Query(default=375, description="Window width"),
    height: Optional[int] = Query(default=800, description="Window height")
):
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width={width}, height={height}, initial-scale=1.0">
        <title>QuickResume Resolution Wrapper</title>
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
        <iframe src="http://localhost:5173/" width="{width}" height="{height}"></iframe>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)
