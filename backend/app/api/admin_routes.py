import asyncio
import hmac
import logging
import os
import sys
import time
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field

from backend.app.config import get_settings
from backend.app.middleware.auth_middleware import verify_admin_token
from backend.app.utils import metrics
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
    # Bounded: the body is read in full before the rate limiter can help.
    email: str = Field(..., max_length=254)
    password: str = Field(..., max_length=1024)


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
    """Process-local counters since this instance started.

    Cloud Run runs several instances that start and stop independently, so
    these are one instance's view, not site totals; site-wide figures live in
    the log-based metrics.
    """

    scope: str = "process"
    lastUpdated: str
    uptimeSeconds: int
    events: dict[str, int]
    eventsByName: dict[str, int]
    contact: dict[str, int]
    phone: dict[str, int]
    rateLimitHits: dict[str, int]


class AdminHealth(BaseModel):
    scope: str = "process"
    status: str
    lastChecked: str
    version: str
    uptimeSeconds: int
    memoryUsageMb: float | None
    requestsByStatusClass: dict[str, int]
    serverErrorRate: float | None


# A rate over a handful of requests is noise, so health only turns degraded
# once there is enough traffic for the ratio to mean something.
DEGRADED_MIN_REQUESTS = 20
DEGRADED_ERROR_RATE = 0.05


def _memory_usage_mb() -> float | None:
    """Peak resident set size of this process, or None where unsupported."""
    try:
        import resource

        peak = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    except (ImportError, OSError):
        return None
    # Linux reports kilobytes, macOS bytes.
    return round(peak / (1024 * 1024 if sys.platform == "darwin" else 1024), 1)

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
    """Event and rate-limit counters for this instance (see AdminAnalytics)."""
    snap = metrics.snapshot()
    events = snap["events"]
    return AdminAnalytics(
        lastUpdated=datetime.now(UTC).isoformat(),
        uptimeSeconds=snap["uptime_seconds"],
        events=events,
        eventsByName=snap["event_names"],
        contact={"sent": events.get("contact.sent", 0), "failed": events.get("contact.failed", 0)},
        phone={
            "requested": events.get("phone.requested", 0),
            "revealed": events.get("phone.revealed", 0),
            "failed": events.get("phone.failed", 0),
        },
        rateLimitHits=snap["rate_limit_hits"],
    )

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
    """Uptime, version, memory and the 5xx ratio for this instance."""
    snap = metrics.snapshot()
    classes = snap["requests_by_status_class"]
    total = sum(classes.values())
    error_rate = round(classes.get("5xx", 0) / total, 4) if total else None
    degraded = (
        total >= DEGRADED_MIN_REQUESTS and error_rate is not None and error_rate > DEGRADED_ERROR_RATE
    )
    return AdminHealth(
        status="degraded" if degraded else "healthy",
        lastChecked=datetime.now(UTC).isoformat(),
        version=get_settings().git_commit or "unknown",
        uptimeSeconds=snap["uptime_seconds"],
        memoryUsageMb=_memory_usage_mb(),
        requestsByStatusClass=classes,
        serverErrorRate=error_rate,
    )
