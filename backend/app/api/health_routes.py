import asyncio
import subprocess
from typing import Any

from fastapi import APIRouter, HTTPException

from ..config import get_settings
from ..utils.logger import setup_logging
from ..utils.supabase_client import SupabaseClient

router = APIRouter()
logger = setup_logging()

def get_version() -> dict[str, Any]:
    """
    Get the current version (git commit) of the application.
    First tries the GIT_COMMIT setting, then the git command.

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
                stderr=subprocess.STDOUT
            ).decode('utf-8').strip()
            return {
                "hash": git_commit,
                "source": "git"
            }
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            logger.warning(f"Failed to get git commit from command: {str(e)}")
            return {
                "hash": "unknown",
                "source": "none",
                "error": str(e)
            }

    except Exception as e:
        logger.error(f"Unexpected error getting version: {str(e)}")
        return {
            "hash": "unknown",
            "source": "error",
            "error": str(e)
        }

async def _check_database() -> tuple[bool, dict[str, Any]]:
    """Probe Supabase connectivity. Returns (ok, detail) and never raises."""
    try:
        # Initialize Supabase client only when the route is called.
        # Use the admin client: the logs table is admin-only under RLS, so the
        # anon client would report a false "unhealthy" even when the DB is fine.
        supabase = SupabaseClient()
        client = supabase.get_admin_client()

        # Try to fetch a single row from logs table without blocking the loop
        await asyncio.to_thread(
            lambda: client.table('logs').select("*").limit(1).execute()
        )
        return True, {
            "status": "operational",
            "connection": "connected",
            "details": "Successfully queried logs table",
        }
    except Exception as e:
        # Logged with detail server-side; the response stays generic because
        # this endpoint is unauthenticated.
        logger.error(f"Health check database probe failed: {str(e)}")
        return False, {
            "status": "failed",
            "connection": "disconnected",
        }


@router.get("/health")
async def health_check():
    """Liveness check: is this process able to serve requests?

    Deliberately returns 200 even when Supabase is unreachable. This path
    backs the Cloud Run startup/liveness probe, so failing it on a dependency
    outage would have the platform kill and restart containers that are
    serving the site perfectly well — the portfolio itself renders from local
    JSON and needs no database. Database state is reported as `degraded` for
    observability; use /api/health/ready for a gate that fails closed.
    """
    db_ok, db_detail = await _check_database()

    return {
        "status": "healthy" if db_ok else "degraded",
        "message": "Service is running",
        "checks": {
            "database": db_detail,
            "version": get_version(),
        },
    }


@router.get("/health/ready")
async def readiness_check():
    """Readiness check: is every dependency actually working?

    Fails closed with 503 so uptime monitoring and deploy verification can
    distinguish "the site is up but the database is down" from "the site is
    up". Not wired to the container probe on purpose — see health_check.
    """
    db_ok, db_detail = await _check_database()
    status_info = {
        "status": "healthy" if db_ok else "unhealthy",
        "message": "Service is running",
        "checks": {
            "database": db_detail,
            "version": get_version(),
        },
    }

    if not db_ok:
        raise HTTPException(status_code=503, detail=status_info)

    return status_info
