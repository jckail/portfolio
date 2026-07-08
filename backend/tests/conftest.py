"""Shared fixtures. Environment must be populated before the app module is
imported, because main.py validates required variables at import time."""
import os

import pytest

_TEST_ENV = {
    "SUPABASE_URL": "https://example.supabase.co",
    "SUPABASE_ANON_KEY": "test-anon-key",
    "SUPABASE_SERVICE_ROLE": "test-service-role",
    "ALLOWED_ORIGINS": "http://localhost:5173",
    "PRODUCTION_URL": "http://localhost:8080",
    "PORT": "8080",
    "ADMIN_EMAIL": "admin@example.com",
    "RESUME_FILE": "JordanKailResume.pdf",
    "ANTHROPIC_API_KEY": "test-anthropic-key",
    "SENDGRID_API_KEY": "test-sendgrid-key",
}

for key, value in _TEST_ENV.items():
    os.environ.setdefault(key, value)


@pytest.fixture(scope="session")
def client():
    from fastapi.testclient import TestClient

    from backend.app.main import app

    # Context manager runs the lifespan (data preload, static mounts)
    with TestClient(app) as test_client:
        yield test_client
