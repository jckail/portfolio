from fastapi import APIRouter

# Create main router
router = APIRouter()

# Import route modules after router creation to avoid circular imports
from .resume_routes import router as resume_router
from .telemetry_routes import router as telemetry_router
from .admin_routes import router as admin_router
from .health_routes import router as health_router
from .custom_resolution import router as custom_resolution_router

# Include all route modules in a specific order
router.include_router(health_router, tags=["health"])  # Health check first
router.include_router(resume_router, tags=["resume"])  # Core functionality second
router.include_router(telemetry_router, tags=["telemetry"])  # Monitoring third
router.include_router(admin_router, prefix="/admin", tags=["admin"])  # Admin last
router.include_router(custom_resolution_router, tags=["custom_resolution"])  # Custom resolution last
