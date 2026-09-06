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

# Assign unconditionally, never setdefault: a developer with real
# SUPABASE_URL / SUPABASE_SERVICE_ROLE / SENDGRID_API_KEY exported in their
# shell would otherwise run the whole suite against production - the health
# probe SELECTs the real logs table, and any uncovered path reaching
# store_log() would INSERT into it.
for key, value in _TEST_ENV.items():
    os.environ[key] = value

# Belt and braces: fail loudly rather than touch a real backend.
if not os.environ["SUPABASE_URL"].startswith("https://example."):
    raise RuntimeError(
        "Test environment is not isolated: SUPABASE_URL points at "
        f"{os.environ['SUPABASE_URL']!r}. Refusing to run against a real project."
    )


@pytest.fixture(scope="session")
def client():
    from fastapi.testclient import TestClient

    from backend.app.main import app

    # Context manager runs the lifespan (data preload, static mounts)
    with TestClient(app) as test_client:
        yield test_client
