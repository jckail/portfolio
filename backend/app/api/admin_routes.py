import asyncio
import os
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from backend.app.config import get_settings
from backend.app.middleware.auth_middleware import verify_admin_token
from backend.app.utils.supabase_client import SupabaseClient

router = APIRouter()

class LoginCredentials(BaseModel):
    email: str
    password: str

@router.post("/login")
async def admin_login(credentials: LoginCredentials):
    """
    Authenticate admin user
    """
    try:
        email = credentials.email
        password = credentials.password

        # Verify against admin email
        admin_email = get_settings().admin_email
        if not admin_email:
            raise HTTPException(
                status_code=500,
                detail="Admin email not configured in environment"
            )

        if email != admin_email:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Get Supabase client only when needed
        supabase = SupabaseClient()

        # Attempt login with Supabase
        response = await supabase.sign_in_with_password(email, password)

        if not response.user or not response.session:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        return {
            "access_token": response.session.access_token,
            "token_type": "bearer"
        }

    except HTTPException:
        raise
    except Exception:
        # Don't leak auth provider internals to the client
        raise HTTPException(status_code=401, detail="Invalid credentials")

@router.post("/logout")
async def admin_logout(
    user = Depends(verify_admin_token),
    authorization: str | None = Header(None)
):
    """
    Logout admin user, invalidating the session token used for the request.
    """
    try:
        supabase = SupabaseClient()
        token = authorization.replace('Bearer ', '') if authorization else None
        await supabase.sign_out(token)
        return {"message": "Successfully logged out"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/verify")
async def verify_admin(user = Depends(verify_admin_token)):
    """
    Verify admin token is valid
    """
    return {"message": "Token is valid", "user": user.email}

@router.get("/analytics")
async def get_analytics(user = Depends(verify_admin_token)):
    """Get analytics data"""
    try:
        analytics = {
            "pageViews": 0,
            "uniqueVisitors": 0,
            "averageTimeOnSite": "0:00",
            "topReferrers": [],
            "lastUpdated": datetime.now(UTC).isoformat()
        }
        return analytics
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def _read_log_files(log_dir: str) -> list[str]:
    """Collect lines from every .log file under log_dir (blocking)."""
    logs: list[str] = []
    for root, _, files in os.walk(log_dir):
        for file in files:
            if file.endswith('.log'):
                with open(os.path.join(root, file)) as f:
                    logs.extend(f.readlines())
    return logs


@router.get("/logs")
async def get_admin_logs(user = Depends(verify_admin_token)):
    """Get application logs"""
    try:
        log_dir = os.path.join(os.path.dirname(__file__), "../logs")
        logs = await asyncio.to_thread(_read_log_files, log_dir)
        return {"logs": logs}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/health")
async def get_admin_health(user = Depends(verify_admin_token)):
    """Get system health information"""
    try:
        health_info = {
            "status": "healthy",
            "lastChecked": datetime.now(UTC).isoformat(),
            "diskSpace": "N/A",
            "memoryUsage": "N/A",
            "activeUsers": 0
        }
        return health_info
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
