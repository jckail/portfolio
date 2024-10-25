from fastapi import APIRouter
from .resume_routes import router as resume_router
from .telemetry_routes import router as telemetry_router
from .health_routes import router as health_router
from .admin_routes import router as admin_router

# Create main router
router = APIRouter()

# Include all route modules
router.include_router(resume_router, tags=["resume"])
router.include_router(telemetry_router, tags=["telemetry"])
router.include_router(health_router, tags=["health"])
router.include_router(admin_router, prefix="/admin", tags=["admin"])
