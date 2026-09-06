"""Tests for the admin authentication boundary.

Written because a mutation probe showed the entire auth layer could be deleted
- `verify_admin_token` replaced with a function that returns an admin - and the
whole suite still passed. The only test that touched `/api/admin/*` asserted a
cache header and never checked a status code, so it held just as well when the
routes returned real data to an anonymous caller.

Every test here is designed to fail if the control it names stops working.
"""
import types

import pytest
from fastapi import HTTPException

from backend.app.middleware import auth_middleware

ADMIN_EMAIL = "admin@example.com"

PROTECTED_ROUTES = [
    ("get", "/api/admin/verify"),
    ("get", "/api/admin/analytics"),
    ("get", "/api/admin/logs"),
    ("get", "/api/admin/health"),
    ("post", "/api/admin/logout"),
    ("get", "/api/logs"),
]


def _user(email):
    return types.SimpleNamespace(user=types.SimpleNamespace(email=email))


@pytest.fixture
def fake_supabase(monkeypatch):
    """Replace Supabase token verification with a controllable stub."""
    state = {"token": None, "result": _user(ADMIN_EMAIL), "raises": None}

    class FakeAuth:
        def get_user(self, token):
            state["token"] = token
            if state["raises"] is not None:
                raise state["raises"]
            return state["result"]

    class FakeClient:
        auth = FakeAuth()

    class FakeSupabase:
        def get_client(self):
            return FakeClient()

    monkeypatch.setattr(auth_middleware, "SupabaseClient", lambda: FakeSupabase())
    return state


# --- The boundary itself --------------------------------------------------

@pytest.mark.parametrize("method,path", PROTECTED_ROUTES)
def test_protected_routes_reject_anonymous_callers(client, method, path):
    """No Authorization header must mean 401 - and no payload."""
    response = getattr(client, method)(path)
    assert response.status_code == 401, f"{path} returned {response.status_code}"
    body = response.text
    assert "access_token" not in body
    assert "session_uuid" not in body


@pytest.mark.parametrize("method,path", PROTECTED_ROUTES)
def test_protected_routes_reject_a_non_admin_token(client, fake_supabase, method, path):
    """A valid Supabase user who is not the admin must get 403, not 200."""
    fake_supabase["result"] = _user("someone.else@example.com")
    response = getattr(client, method)(path, headers={"Authorization": "Bearer valid-token"})
    assert response.status_code == 403, f"{path} returned {response.status_code}"


# --- verify_auth_token ----------------------------------------------------

@pytest.mark.anyio
async def test_missing_header_is_rejected():
    with pytest.raises(HTTPException) as exc:
        await auth_middleware.verify_auth_token(None)
    assert exc.value.status_code == 401


@pytest.mark.anyio
async def test_bearer_prefix_is_stripped(fake_supabase):
    await auth_middleware.verify_auth_token("Bearer abc.def")
    assert fake_supabase["token"] == "abc.def"


@pytest.mark.anyio
async def test_bearer_stripping_does_not_mangle_the_token(fake_supabase):
    """`.replace('Bearer ', '')` strips every occurrence, not just the prefix,
    so a token containing the literal text would be silently corrupted."""
    await auth_middleware.verify_auth_token("Bearer aBearer b")
    assert fake_supabase["token"] == "aBearer b"


@pytest.mark.anyio
async def test_provider_errors_do_not_reach_the_client(fake_supabase):
    fake_supabase["raises"] = RuntimeError("supabase project xyz unreachable")
    with pytest.raises(HTTPException) as exc:
        await auth_middleware.verify_auth_token("Bearer t")
    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid token"
    assert "supabase" not in str(exc.value.detail).lower()


@pytest.mark.anyio
async def test_a_null_user_is_rejected(fake_supabase):
    fake_supabase["result"] = types.SimpleNamespace(user=None)
    with pytest.raises(HTTPException) as exc:
        await auth_middleware.verify_auth_token("Bearer t")
    assert exc.value.status_code == 401


# --- verify_admin_token ---------------------------------------------------

@pytest.mark.anyio
async def test_non_admin_email_is_forbidden(fake_supabase):
    fake_supabase["result"] = _user("someone.else@example.com")
    with pytest.raises(HTTPException) as exc:
        await auth_middleware.verify_admin_token("Bearer t")
    assert exc.value.status_code == 403


@pytest.mark.anyio
async def test_admin_email_is_accepted(fake_supabase):
    user = await auth_middleware.verify_admin_token("Bearer t")
    assert user.email == ADMIN_EMAIL


@pytest.mark.anyio
@pytest.mark.parametrize(
    "email",
    [
        "Admin@Example.com",          # case variant
        "admin@example.com.evil.tld",  # suffix
        "xadmin@example.com",          # prefix
        "",
        None,
    ],
)
async def test_admin_comparison_is_exact(fake_supabase, email):
    """Pins that no casefold or substring match creeps into the check."""
    fake_supabase["result"] = _user(email)
    with pytest.raises(HTTPException) as exc:
        await auth_middleware.verify_admin_token("Bearer t")
    assert exc.value.status_code == 403


@pytest.mark.anyio
async def test_unconfigured_admin_email_fails_closed(fake_supabase, monkeypatch):
    """With no ADMIN_EMAIL the route must error, never authorise."""
    from backend.app import config

    real = config.get_settings()
    monkeypatch.setattr(
        auth_middleware,
        "get_settings",
        lambda: types.SimpleNamespace(admin_email="", **{
            k: getattr(real, k) for k in ("production_url",) if hasattr(real, k)
        }),
    )
    with pytest.raises(HTTPException) as exc:
        await auth_middleware.verify_admin_token("Bearer t")
    assert exc.value.status_code == 500


# --- /api/admin/login -----------------------------------------------------

def test_login_rejects_a_non_admin_email_without_calling_supabase(client, monkeypatch):
    """The email is checked before any credential reaches the auth provider,
    so the endpoint cannot be used to relay password attempts."""
    from backend.app.api import admin_routes

    called = {"n": 0}

    class FakeSupabase:
        async def sign_in_with_password(self, email, password):
            called["n"] += 1
            raise AssertionError("should not be reached")

    monkeypatch.setattr(admin_routes, "SupabaseClient", lambda: FakeSupabase())
    response = client.post(
        "/api/admin/login", json={"email": "nope@example.com", "password": "x"}
    )
    assert response.status_code == 401
    assert called["n"] == 0


def test_login_does_not_leak_provider_errors(client, monkeypatch):
    from backend.app.api import admin_routes

    class FakeSupabase:
        async def sign_in_with_password(self, email, password):
            raise Exception("supabase: user not found in project abc123")

    monkeypatch.setattr(admin_routes, "SupabaseClient", lambda: FakeSupabase())
    response = client.post(
        "/api/admin/login", json={"email": ADMIN_EMAIL, "password": "x"}
    )
    assert response.status_code == 401
    assert "supabase" not in response.text.lower()
    assert "abc123" not in response.text
