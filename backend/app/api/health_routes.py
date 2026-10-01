import asyncio
import subprocess
import time
from typing import Any

from fastapi import APIRouter, HTTPException

from ..config import get_settings
from ..utils.logger import setup_logging
from ..utils.supabase_client import SupabaseClient

router = APIRouter()
logger = setup_logging()

# The database probe behind liveness is cached and time-boxed. /api/health is
# public and backs the Cloud Run startup probe (timeoutSeconds=3), so it must
# neither run a service-role query per hit nor wait on a hanging Supabase -
# the SDK's own timeout is 120s.
DB_PROBE_CACHE_SECONDS = 15.0
DB_PROBE_TIMEOUT_SECONDS = 2.0
READY_PROBE_TIMEOUT_SECONDS = 5.0

_db_cache: tuple[float, bool, dict[str, Any]] | None = None
_db_lock = asyncio.Lock()


def get_version() -> dict[str, Any]:
    """
    Get the current version (git commit) of the application.
    First tries the GIT_COMMIT setting, then the git command.

    Called once at import; the result never changes for a running process.

    Returns:
        Dict containing version info and source
    """
    try:
        git_commit = get_settings().git_commit
        if git_commit:
            return {
                "hash": git_commit,
                "source": "environment"
            }

        try:
            git_commit = subprocess.check_output(
                ['git', 'rev-parse', 'HEAD'],
                stderr=subprocess.STDOUT,
                timeout=5,
            ).decode('utf-8').strip()
            return {
                "hash": git_commit,
                "source": "git"
            }
        except (subprocess.SubprocessError, OSError) as e:
            logger.warning(f"Failed to get git commit from command: {str(e)}")
            return {
                "hash": "unknown",
                "source": "none",
            }

    except Exception:
        logger.exception("Unexpected error getting version")
        return {
            "hash": "unknown",
            "source": "error",
        }


VERSION_INFO = get_version()


async def _check_database(deadline_seconds: float | None = None) -> tuple[bool, dict[str, Any]]:
    """Probe Supabase connectivity. Returns (ok, detail) and never raises."""
    if deadline_seconds is None:
        deadline_seconds = DB_PROBE_TIMEOUT_SECONDS
    try:
        # Initialize Supabase client only when the route is called.
        # Use the admin client: the logs table is admin-only under RLS, so the
        # anon client would report a false "unhealthy" even when the DB is fine.
        supabase = SupabaseClient()
        client = supabase.get_admin_client()

        # Fetch one narrow row without blocking the loop. On timeout the
        # worker thread finishes on its own; the caller stops waiting.
        await asyncio.wait_for(
            asyncio.to_thread(
                lambda: client.table('logs').select("timestamp").limit(1).execute()
            ),
            timeout=deadline_seconds,
        )
        return True, {
            "status": "operational",
            "connection": "connected",
            "details": "Successfully queried logs table",
        }
    except Exception as e:
        # Logged with detail server-side; the response stays generic because
        # this endpoint is unauthenticated.
        logger.error(f"Health check database probe failed: {type(e).__name__}: {e}")
        return False, {
            "status": "failed",
            "connection": "disconnected",
        }


async def _cached_database_status() -> tuple[bool, dict[str, Any]]:
    """Probe result reused for DB_PROBE_CACHE_SECONDS; one probe at a time."""
    global _db_cache
    if _db_cache and time.monotonic() - _db_cache[0] < DB_PROBE_CACHE_SECONDS:
        return _db_cache[1], _db_cache[2]
    async with _db_lock:
        # Another request may have refreshed it while we waited for the lock.
        if _db_cache and time.monotonic() - _db_cache[0] < DB_PROBE_CACHE_SECONDS:
            return _db_cache[1], _db_cache[2]
        ok, detail = await _check_database()
        _db_cache = (time.monotonic(), ok, detail)
        return ok, detail


@router.get("/health")
async def health_check():
    """Liveness check: is this process able to serve requests?

    Deliberately returns 200 even when Supabase is unreachable. This path
    backs the Cloud Run startup/liveness probe, so failing it on a dependency
    outage would have the platform kill and restart containers that are
    serving the site perfectly well — the portfolio itself renders from local
    JSON and needs no database. Database state is reported as `degraded` for
    observability; use /api/health/ready for a gate that fails closed.

    The database state is cached (see DB_PROBE_CACHE_SECONDS) and bounded by
    a short timeout, so this answers well inside the probe deadline.
    """
    db_ok, db_detail = await _cached_database_status()

    return {
        "status": "healthy" if db_ok else "degraded",
        "message": "Service is running",
        "checks": {
            "database": db_detail,
            "version": VERSION_INFO,
        },
    }


@router.get("/health/ready")
async def readiness_check():
    """Readiness check: is every dependency actually working?

    Fails closed with 503 so uptime monitoring and deploy verification can
    distinguish "the site is up but the database is down" from "the site is
    up". Not wired to the container probe on purpose — see health_check.
    """
    db_ok, db_detail = await _check_database(deadline_seconds=READY_PROBE_TIMEOUT_SECONDS)
    status_info = {
        "status": "healthy" if db_ok else "unhealthy",
        "message": "Service is running",
        "checks": {
            "database": db_detail,
            "version": VERSION_INFO,
        },
    }

    if not db_ok:
        raise HTTPException(status_code=503, detail=status_info)

    return status_info
