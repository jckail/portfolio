from fastapi import APIRouter

# Import route modules after router creation to avoid circular imports
from .resume_routes import router as resume_router
from .telemetry_routes import router as telemetry_router
from .admin_routes import router as admin_router
from .health_routes import router as health_router
from .custom_resolution import router as custom_resolution_router
from .skills_routes import router as skills_router
from .experience_routes import router as experience_router
from .project_routes import router as project_router
from .contact_routes import router as contact_router
from .aboutme_routes import router as aboutme_router
from .zuni_routes import router as zuni_router
from .chat_routes import router as chat_router

# Create api router
api_router = APIRouter(prefix="/api")


# Include all route modules in a specific order
api_router.include_router(health_router, tags=["health"])  # Health check first
api_router.include_router(resume_router, tags=["resume"])  # Core functionality second
api_router.include_router(telemetry_router, tags=["telemetry"])  # Monitoring third

api_router.include_router(custom_resolution_router, tags=["custom_resolution"])  # Custom resolution last
api_router.include_router(skills_router, tags=["skills"])  # Skills routes
api_router.include_router(experience_router, tags=["experience"])  # Experience routes
api_router.include_router(project_router, tags=["projects"])  # Project routes
api_router.include_router(contact_router, tags=["contact"])  # Contact routes
api_router.include_router(aboutme_router, tags=["aboutme"])  # About me routes
api_router.include_router(zuni_router, tags=["zuni"])  # About me routes


# admin is special
api_router.include_router(admin_router, prefix="/admin", tags=["admin"])  # Admin last

# Create api router
ws_router = APIRouter(prefix="/ws")
ws_router.include_router(chat_router, tags=["chat"])