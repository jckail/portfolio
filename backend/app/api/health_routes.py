from fastapi import APIRouter, HTTPException
from ..utils.logger import setup_logging
from ..utils.supabase_client import SupabaseClient

router = APIRouter()
logger = setup_logging()

@router.get("/health")
async def health_check():
    """Check if the service is healthy and verify Supabase connectivity"""
    try:
        # Initialize Supabase client only when the route is called
        supabase = SupabaseClient()
        client = supabase.get_client()
        
        # Try to fetch a single row from logs table with a limit
        result = client.table('logs').select("*").limit(1).execute()
        
        return {
            "status": "healthy",
            "message": "Service is running",
            "supabase_connection": "connected",
            "database_status": "operational"
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail={
                "status": "unhealthy",
                "message": "Service is running but database connection failed",
                "supabase_connection": "disconnected",
                "error": str(e)
            }
        )
