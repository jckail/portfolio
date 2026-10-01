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
from backend.app.utils.events import log_event
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
_login_ip_limiter = SlidingWindowLimiter(max_events=5, window_seconds=900, global_max_events=10_000, name="admin_login_ip")
_login_global_limiter = SlidingWindowLimiter(max_events=20, window_seconds=3600, name="admin_login_global")

# Every failed login takes at least this long, so a wrong email (rejected
# locally) and a wrong password (rejected after a Supabase round trip) are not
# distinguishable by timing - otherwise response time reveals ADMIN_EMAIL.
LOGIN_FAILURE_MIN_SECONDS = 1.0

class LoginCredentials(BaseModel):
    email: str
    password: str


class LoginToken(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AdminMessage(BaseModel):
    message: str


class TokenStatus(AdminMessage):
    user: str | None


class AdminLogFiles(BaseModel):
    logs: list[str]


class AdminAnalytics(BaseModel):
    pageViews: int = 0
    uniqueVisitors: int = 0
    averageTimeOnSite: str = "0:00"
    topReferrers: list[str] = []
    lastUpdated: str


class AdminHealth(BaseModel):
    status: str = "healthy"
    lastChecked: str
    diskSpace: str = "N/A"
    memoryUsage: str = "N/A"
    activeUsers: int = 0

async def _pad_failure(started: float) -> None:
    remaining = LOGIN_FAILURE_MIN_SECONDS - (time.monotonic() - started)
    if remaining > 0:
        await asyncio.sleep(remaining)


@router.post("/login", response_model=LoginToken)
async def admin_login(request: Request, credentials: LoginCredentials) -> LoginToken:
    """
    Authenticate admin user
    """
    ip = client_ip(request)
    # Check both before charging either, so a call refused by one limiter
    # leaves the other untouched. Charging happens before the attempt (not on
    # failure) because the attempt awaits: concurrent guesses would otherwise
    # all pass the check before any of them was recorded.
    if not _login_ip_limiter.check(ip):
        _login_ip_limiter.report_blocked()
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again later.")
    if not _login_global_limiter.check("*"):
        _login_global_limiter.report_blocked()
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again later.")
    _login_ip_limiter.record(ip)
    _login_global_limiter.record("*")

    started = time.monotonic()
    try:
        result = await _attempt_login(credentials)
    except HTTPException as exc:
        log_event("auth.login_failed", status=exc.status_code)
        if exc.status_code == 401:
            await _pad_failure(started)
        raise
    log_event("auth.login_succeeded")
    _login_ip_limiter.refund(ip)
    _login_global_limiter.refund("*")
    return result


async def _attempt_login(credentials: LoginCredentials) -> LoginToken:
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

        return LoginToken(access_token=response.session.access_token)

    except HTTPException:
        raise
    except Exception:
        # Don't leak auth provider internals to the client
        logger.warning("Admin login failed at the auth provider", exc_info=True)
        raise HTTPException(status_code=401, detail="Invalid credentials")

@router.post("/logout", response_model=AdminMessage)
async def admin_logout(
    user = Depends(verify_admin_token),
    authorization: str | None = Header(None)
) -> AdminMessage:
    """
    Logout admin user, invalidating the session token used for the request.
    """
    try:
        supabase = SupabaseClient()
        token = authorization.removeprefix('Bearer ').strip() if authorization else None
        await supabase.sign_out(token)
    except Exception:
        logger.exception("Admin logout failed")
        raise HTTPException(status_code=500, detail="Logout failed")
    return AdminMessage(message="Successfully logged out")

@router.get("/verify", response_model=TokenStatus)
async def verify_admin(user = Depends(verify_admin_token)) -> TokenStatus:
    """
    Verify admin token is valid
    """
    return TokenStatus(message="Token is valid", user=user.email)

@router.get("/analytics", response_model=AdminAnalytics)
async def get_analytics(user = Depends(verify_admin_token)) -> AdminAnalytics:
    """Placeholder: no analytics backend is wired up, so every count is zero."""
    return AdminAnalytics(lastUpdated=datetime.now(UTC).isoformat())

def _read_log_files(log_dir: str) -> list[str]:
    """Collect lines from every .log file under log_dir (blocking)."""
    logs: list[str] = []
    for root, _, files in os.walk(log_dir):
        for file in files:
            if file.endswith('.log'):
                with open(os.path.join(root, file)) as f:
                    logs.extend(f.readlines())
    return logs


@router.get("/logs", response_model=AdminLogFiles)
async def get_admin_logs(user = Depends(verify_admin_token)) -> AdminLogFiles:
    """Get application logs"""
    try:
        log_dir = os.path.join(os.path.dirname(__file__), "../logs")
        logs = await asyncio.to_thread(_read_log_files, log_dir)
    except Exception:
        logger.exception("Failed to read application logs")
        raise HTTPException(status_code=500, detail="Unable to read logs")
    return AdminLogFiles(logs=logs)


@router.get("/health", response_model=AdminHealth)
async def get_admin_health(user = Depends(verify_admin_token)) -> AdminHealth:
    """Placeholder: no host metrics are collected, so these are fixed values."""
    return AdminHealth(lastChecked=datetime.now(UTC).isoformat())
