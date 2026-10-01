import asyncio
import hmac
import logging
import os
import time
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel

from backend.app.config import get_settings
from backend.app.middleware.auth_middleware import verify_admin_token
from backend.app.utils.rate_limit import SlidingWindowLimiter, client_ip
from backend.app.utils.supabase_client import SupabaseClient

logger = logging.getLogger(__name__)

router = APIRouter()

# Password guessing is bounded here rather than left to Supabase: its own
# per-IP auth limit sees only this service's egress address, so a brute-forcer
# would exhaust it for everyone - including the real admin.
#
# The global ceiling is a deliberate trade: it caps guessing even when every
# attempt arrives from a fresh address, at the cost that anyone willing to send
# 20 bad logins an hour can keep the admin login answering 429 until the window
# drains. The admin dashboard is a convenience, not an operational dependency,
# so that lockout is preferred over unbounded guessing. Successful logins are
# refunded, so only failures count toward either ceiling.
_login_ip_limiter = SlidingWindowLimiter(max_events=5, window_seconds=900, global_max_events=10_000)
_login_global_limiter = SlidingWindowLimiter(max_events=20, window_seconds=3600)

# Every failed login takes at least this long, so a wrong email (rejected
# locally) and a wrong password (rejected after a Supabase round trip) are not
# distinguishable by timing - otherwise response time reveals ADMIN_EMAIL.
LOGIN_FAILURE_MIN_SECONDS = 1.0

class LoginCredentials(BaseModel):
    email: str
    password: str

async def _pad_failure(started: float) -> None:
    remaining = LOGIN_FAILURE_MIN_SECONDS - (time.monotonic() - started)
    if remaining > 0:
        await asyncio.sleep(remaining)


@router.post("/login")
async def admin_login(request: Request, credentials: LoginCredentials):
    """
    Authenticate admin user
    """
    ip = client_ip(request)
    # Check both before charging either, so a call refused by one limiter
    # leaves the other untouched. Charging happens before the attempt (not on
    # failure) because the attempt awaits: concurrent guesses would otherwise
    # all pass the check before any of them was recorded.
    if not _login_ip_limiter.check(ip) or not _login_global_limiter.check("*"):
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again later.")
    _login_ip_limiter.record(ip)
    _login_global_limiter.record("*")

    started = time.monotonic()
    try:
        result = await _attempt_login(credentials)
    except HTTPException as exc:
        if exc.status_code == 401:
            await _pad_failure(started)
        raise
    _login_ip_limiter.refund(ip)
    _login_global_limiter.refund("*")
    return result


async def _attempt_login(credentials: LoginCredentials):
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

        # Constant-time compare; the timing floor above covers the rest.
        if not hmac.compare_digest(email.encode(), admin_email.encode()):
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
        logger.warning("Admin login failed at the auth provider", exc_info=True)
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
        token = authorization.removeprefix('Bearer ').strip() if authorization else None
        await supabase.sign_out(token)
        return {"message": "Successfully logged out"}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Admin logout failed")
        raise HTTPException(status_code=500, detail="Logout failed")

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
    except Exception:
        logger.exception("Failed to build analytics")
        raise HTTPException(status_code=500, detail="Unable to load analytics")

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
    except Exception:
        logger.exception("Failed to read application logs")
        raise HTTPException(status_code=500, detail="Unable to read logs")



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
    except Exception:
        logger.exception("Failed to build admin health info")
        raise HTTPException(status_code=500, detail="Unable to load health info")
