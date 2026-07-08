from fastapi import APIRouter, HTTPException
from ..config import get_settings
from ..utils.logger import setup_logging
from ..utils.supabase_client import SupabaseClient
import asyncio
import subprocess
from typing import Dict, Any

router = APIRouter()
logger = setup_logging()

def get_version() -> Dict[str, Any]:
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

@router.get("/health")
async def health_check():
    """
    Comprehensive health check endpoint that verifies:
    - Service status
    - Supabase database connectivity
    - Application version (git commit)
    
    Returns:
        JSON object containing health status, database connection status,
        and version information
    
    Raises:
        HTTPException: If health check fails, with detailed error information
    """
    status_info = {
        "status": "unhealthy",
        "message": "Service is running",
        "checks": {
            "database": {
                "status": "unchecked",
                "details": None
            },
            "version": get_version()
        }
    }
    
    try:
        # Initialize Supabase client only when the route is called.
        # Use the admin client: the logs table is admin-only under RLS, so the
        # anon client would report a false "unhealthy" even when the DB is fine.
        supabase = SupabaseClient()
        client = supabase.get_admin_client()

        # Try to fetch a single row from logs table without blocking the loop
        result = await asyncio.to_thread(
            lambda: client.table('logs').select("*").limit(1).execute()
        )
        
        # Update database check status
        status_info["checks"]["database"] = {
            "status": "operational",
            "connection": "connected",
            "details": "Successfully queried logs table"
        }
        
        # Update overall status
        status_info["status"] = "healthy"
        return status_info
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        
        # Update database check status with error
        status_info["checks"]["database"] = {
            "status": "failed",
            "connection": "disconnected",
            "error": str(e)
        }
        
        raise HTTPException(
            status_code=503,
            detail=status_info
        )
