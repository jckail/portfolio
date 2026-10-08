"""Regression tests for the backend API hardening pass: ingest validation and
cost, file-fallback bounds, X-Forwarded-For trust, admin login throttling,
health probe caching, and generic error bodies.

Each test names the failure it guards against, so a refactor that brings one
back fails here rather than in production.
"""
import dataclasses
import threading
import time
import types
import uuid

import pytest

from backend.app import config
from backend.app.api import (
    admin_routes,
    contact_routes,
    content,
    health_routes,
    telemetry_routes,
)
from backend.app.models import data_loader
from backend.app.services import owner_mail
from backend.app.utils import rate_limit

ADMIN_EMAIL = "admin@example.com"


@pytest.fixture(autouse=True)
def _reset_state(monkeypatch):
    for limiter in (
        telemetry_routes._ingest_limiter,
        contact_routes._email_limiter,
        admin_routes._login_ip_limiter,
        admin_routes._login_global_limiter,
    ):
        limiter.reset()
    health_routes._db_cache = None
    monkeypatch.setattr(admin_routes, "LOGIN_FAILURE_MIN_SECONDS", 0.0)
    yield
    for limiter in (
        telemetry_routes._ingest_limiter,
        contact_routes._email_limiter,
        admin_routes._login_ip_limiter,
        admin_routes._login_global_limiter,
    ):
        limiter.reset()
    health_routes._db_cache = None


def _settings(**overrides):
    return dataclasses.replace(config.get_settings(), **overrides)


class _FakeLogStore:
    """Stands in for SupabaseClient on the ingest path."""

    def __init__(self, result="ok"):
        self.batches: list[list[dict]] = []
        self.result = result

    async def store_logs_batch(self, logs):
        self.batches.append(logs)
        return self.result


@pytest.fixture
def log_store(monkeypatch):
    store = _FakeLogStore()
    monkeypatch.setattr(telemetry_routes, "SupabaseClient", lambda: store)
    return store


def _batch(n):
    return {"logs": [{"sessionUUID": str(uuid.uuid4()), "message": f"m{i}"} for i in range(n)]}


# --- Telemetry / log ingest -----------------------------------------------

@pytest.mark.parametrize(
    "body",
    [
        {"sessionUUID": 123, "timestamp": 5},
        {"sessionUUID": str(uuid.uuid4()), "timestamp": 5},
        {"sessionUUID": str(uuid.uuid4()), "timestamp": "2026-01-01T00:00:00Z", "browserInfo": "x"},
        {"timestamp": "2026-01-01T00:00:00Z"},
    ],
)
def test_telemetry_type_errors_are_422_not_500(client, body):
    """Wrong-typed fields reached uuid.UUID()/str.replace() and surfaced as a
    500 from the generic handler."""
    response = client.post("/api/telemetry", json=body)
    assert response.status_code == 422, response.text
    # Validation errors never echo the submitted values back.
    assert '"input"' not in response.text


def test_log_batch_is_one_bulk_insert(client, log_store):
    """Each entry used to be its own service-role insert - 50 round trips
    per anonymous request."""
    response = client.post("/api/log/batch", json=_batch(10))
    assert response.status_code == 200
    assert len(log_store.batches) == 1
    rows = log_store.batches[0]
    assert len(rows) == 10
    assert all(row["source"] == "frontend" and row["session_uuid"] for row in rows)


def test_log_batch_rejects_wrong_typed_entries(client, log_store):
    body = {"logs": [{"sessionUUID": str(uuid.uuid4()), "message": {"nested": 1}}]}
    response = client.post("/api/log/batch", json=body)
    assert response.status_code == 422
    assert log_store.batches == []


def test_log_batch_is_charged_per_entry(client, log_store):
    """A batch consumed one limiter token while storing up to 50 rows, so
    batching multiplied the allowance by 50."""
    per_ip = telemetry_routes._ingest_limiter.max_events
    batches_allowed = per_ip // telemetry_routes.MAX_BATCH_LOGS
    statuses = [
        client.post("/api/log/batch", json=_batch(telemetry_routes.MAX_BATCH_LOGS)).status_code
        for _ in range(batches_allowed + 1)
    ]
    assert statuses[:batches_allowed] == [200] * batches_allowed
    assert statuses[-1] == 429
    assert len(log_store.batches) == batches_allowed


def test_no_file_fallback_on_cloud_run(client, monkeypatch, tmp_path):
    """Cloud Run's filesystem is instance memory; an anonymous caller during a
    Supabase outage could fill it."""
    monkeypatch.setattr(telemetry_routes, "SupabaseClient", lambda: _FakeLogStore(result=None))
    monkeypatch.setattr(telemetry_routes, "get_settings", lambda: _settings(on_cloud_run=True))
    writes = []
    monkeypatch.setattr(telemetry_routes, "_append_line", lambda *a: writes.append(a))

    response = client.post("/api/log/batch", json=_batch(3))
    assert response.status_code == 200
    assert writes == []


def test_local_file_fallback_is_capped(client, monkeypatch):
    monkeypatch.setattr(telemetry_routes, "SupabaseClient", lambda: _FakeLogStore(result=None))
    monkeypatch.setattr(telemetry_routes, "get_settings", lambda: _settings(on_cloud_run=False))
    monkeypatch.setattr(telemetry_routes, "_fallback_bytes_written", 0)
    monkeypatch.setattr(telemetry_routes, "MAX_FALLBACK_TOTAL_BYTES", 250)
    writes = []
    monkeypatch.setattr(telemetry_routes, "_append_line", lambda path, data: writes.append(data))

    body = {"logs": [{"sessionUUID": str(uuid.uuid4()), "message": "x" * 100}]}
    for _ in range(5):
        assert client.post("/api/log/batch", json=body).status_code == 200
    written = sum(len(data.encode()) for data in writes)
    assert 0 < written <= 250
    assert len(writes) < 5


# --- X-Forwarded-For trust ------------------------------------------------

def test_forwarded_for_trust_defaults(monkeypatch):
    for var in ("K_SERVICE", "TRUST_FORWARDED_FOR", "TRUSTED_PROXY_HOPS"):
        monkeypatch.delenv(var, raising=False)
    # Local / docker-compose: nothing appends to the header, so ignore it.
    assert config._forwarded_for_trust(on_cloud_run=False) is False
    # Cloud Run: Google's front end appends the real peer - trust must stay on.
    assert config._forwarded_for_trust(on_cloud_run=True) is True

    monkeypatch.setenv("TRUSTED_PROXY_HOPS", "1")
    assert config._forwarded_for_trust(on_cloud_run=False) is True

    monkeypatch.delenv("TRUSTED_PROXY_HOPS")
    monkeypatch.setenv("TRUST_FORWARDED_FOR", "0")
    assert config._forwarded_for_trust(on_cloud_run=True) is False
    monkeypatch.setenv("TRUST_FORWARDED_FOR", "true")
    assert config._forwarded_for_trust(on_cloud_run=False) is True


def test_spoofed_forwarded_for_does_not_reset_a_bucket_when_trust_is_off(
    client, monkeypatch
):
    """With no appending proxy, the 'rightmost' hop is the caller's own text:
    rotating it handed out a fresh contact-form bucket per request."""
    monkeypatch.setattr(rate_limit, "get_settings", lambda: _settings(trust_forwarded_for=False))

    class FakeSendGrid:
        def __init__(self, _key):
            pass

        def send(self, _message):
            return types.SimpleNamespace(status_code=202)

    monkeypatch.setattr(owner_mail, "SendGridAPIClient", FakeSendGrid)
    payload = {"company": "Private Example Labs", "from_email": "a@example.com", "subject": "Hi", "message": "body"}

    limit = contact_routes._email_limiter.max_events
    for i in range(limit):
        response = client.post(
            "/api/contact/send-email", json=payload, headers={"X-Forwarded-For": f"203.0.113.{i}"}
        )
        assert response.status_code == 200
    response = client.post(
        "/api/contact/send-email", json=payload, headers={"X-Forwarded-For": "198.51.100.99"}
    )
    assert response.status_code == 429


def test_contact_send_runs_off_the_event_loop_thread(client, monkeypatch):
    """The synchronous SendGrid call stalled every stream on the worker."""
    seen = {}

    class FakeSendGrid:
        def __init__(self, _key):
            pass

        def send(self, _message):
            seen["thread"] = threading.current_thread()
            return types.SimpleNamespace(status_code=202)

    monkeypatch.setattr(owner_mail, "SendGridAPIClient", FakeSendGrid)
    response = client.post(
        "/api/contact/send-email",
        json={"company": "Private Example Labs", "from_email": "a@example.com", "subject": "Hi", "message": "body"},
    )
    assert response.status_code == 200
    assert seen["thread"] is not threading.main_thread()
    assert seen["thread"].name.startswith(("asyncio", "ThreadPoolExecutor", "AnyIO"))


# --- Dev auth bypass ------------------------------------------------------

def _req(host="localhost:8080", peer="127.0.0.1", **headers):
    hdrs = {"host": host, **headers}
    return types.SimpleNamespace(headers=hdrs, client=types.SimpleNamespace(host=peer))


@pytest.mark.parametrize(
    "request_kwargs,expected",
    [
        ({}, True),
        ({"host": "127.0.0.1:5173"}, True),
        ({"host": "[::1]:8080", "peer": "::1"}, True),
        # DNS rebinding: loopback peer, attacker hostname.
        ({"host": "rebind.evil.tld:8080"}, False),
        # LAN caller forwarded by a local proxy.
        ({"x-forwarded-for": "192.168.1.20"}, False),
        ({"peer": "192.168.1.20"}, False),
    ],
)
def test_dev_bypass_requires_loopback_peer_and_local_host(monkeypatch, request_kwargs, expected):
    monkeypatch.setattr(telemetry_routes, "get_settings", lambda: _settings(dev_mode=True, on_cloud_run=False))
    assert telemetry_routes.is_local_dev_environment(_req(**request_kwargs)) is expected


def test_dev_bypass_never_applies_on_cloud_run(monkeypatch):
    monkeypatch.setattr(telemetry_routes, "get_settings", lambda: _settings(dev_mode=True, on_cloud_run=True))
    assert telemetry_routes.is_local_dev_environment(_req()) is False


# --- Admin login ----------------------------------------------------------

class _FakeAuth:
    def __init__(self):
        self.calls = 0

    async def sign_in_with_password(self, email, password):
        self.calls += 1
        return types.SimpleNamespace(user=None, session=None)


def test_admin_login_is_rate_limited_per_ip(client, monkeypatch):
    """No limiter: a brute-forcer could also burn Supabase's per-IP auth quota,
    which sees only our egress address, and lock the real admin out."""
    auth = _FakeAuth()
    monkeypatch.setattr(admin_routes, "SupabaseClient", lambda: auth)
    creds = {"email": ADMIN_EMAIL, "password": "guess"}
    statuses = [client.post("/api/admin/login", json=creds).status_code for _ in range(6)]
    assert statuses == [401] * 5 + [429]
    assert auth.calls == 5


def test_admin_login_has_a_global_ceiling(client, monkeypatch):
    monkeypatch.setattr(admin_routes, "SupabaseClient", lambda: _FakeAuth())
    monkeypatch.setattr(rate_limit, "get_settings", lambda: _settings(trust_forwarded_for=True))
    creds = {"email": ADMIN_EMAIL, "password": "guess"}
    limit = admin_routes._login_global_limiter.max_events
    for i in range(limit):
        r = client.post("/api/admin/login", json=creds, headers={"X-Forwarded-For": f"203.0.113.{i}"})
        assert r.status_code == 401
    r = client.post("/api/admin/login", json=creds, headers={"X-Forwarded-For": "198.51.100.1"})
    assert r.status_code == 429


def test_admin_login_global_rejection_does_not_charge_the_ip_bucket(client, monkeypatch):
    """The IP limiter used to record before the global one was consulted, so a
    call the global ceiling refused still spent the caller's own allowance."""
    monkeypatch.setattr(admin_routes, "SupabaseClient", lambda: _FakeAuth())
    monkeypatch.setattr(rate_limit, "get_settings", lambda: _settings(trust_forwarded_for=True))
    creds = {"email": ADMIN_EMAIL, "password": "guess"}
    for _ in range(admin_routes._login_global_limiter.max_events):
        admin_routes._login_global_limiter.record("*")
    ip = "198.51.100.2"
    for _ in range(3):
        r = client.post("/api/admin/login", json=creds, headers={"X-Forwarded-For": ip})
        assert r.status_code == 429
    assert admin_routes._login_ip_limiter.check(ip, cost=admin_routes._login_ip_limiter.max_events)


def test_successful_admin_logins_do_not_count_toward_the_ceilings(client, monkeypatch):
    class OkAuth:
        async def sign_in_with_password(self, email, password):
            return types.SimpleNamespace(
                user=types.SimpleNamespace(email=email),
                session=types.SimpleNamespace(access_token="tok"),
            )

    monkeypatch.setattr(admin_routes, "SupabaseClient", lambda: OkAuth())
    creds = {"email": ADMIN_EMAIL, "password": "right"}
    runs = admin_routes._login_global_limiter.max_events + 1
    assert [client.post("/api/admin/login", json=creds).status_code for _ in range(runs)] == [200] * runs


def test_limiter_check_records_nothing_and_refund_returns_capacity():
    limiter = rate_limit.SlidingWindowLimiter(max_events=2, window_seconds=60)
    assert limiter.check("k") and limiter.check("k")
    assert limiter.allow("k") and limiter.allow("k")
    assert not limiter.check("k")
    limiter.refund("k")
    assert limiter.allow("k")
    assert not limiter.allow("k")


def test_wrong_email_failure_is_padded_to_the_timing_floor(client, monkeypatch):
    """A non-admin email returned at once while the admin email waited on
    Supabase, so response time revealed ADMIN_EMAIL."""
    monkeypatch.setattr(admin_routes, "LOGIN_FAILURE_MIN_SECONDS", 0.2)
    auth = _FakeAuth()
    monkeypatch.setattr(admin_routes, "SupabaseClient", lambda: auth)

    started = time.monotonic()
    response = client.post("/api/admin/login", json={"email": "nope@example.com", "password": "x"})
    assert response.status_code == 401
    assert time.monotonic() - started >= 0.2
    # Still never relays the attempt to the provider.
    assert auth.calls == 0


def test_admin_login_still_succeeds_for_the_admin(client, monkeypatch):
    class OkAuth:
        async def sign_in_with_password(self, email, password):
            return types.SimpleNamespace(
                user=types.SimpleNamespace(email=email),
                session=types.SimpleNamespace(access_token="tok"),
            )

    monkeypatch.setattr(admin_routes, "SupabaseClient", lambda: OkAuth())
    response = client.post("/api/admin/login", json={"email": ADMIN_EMAIL, "password": "right"})
    assert response.status_code == 200
    assert response.json()["access_token"] == "tok"


def test_admin_logout_does_not_echo_provider_errors(client, monkeypatch):
    from backend.app.main import app
    from backend.app.middleware.auth_middleware import verify_admin_token

    class FailingSignOut:
        async def sign_out(self, token):
            raise Exception("Sign out failed: project abc123 token store")

    monkeypatch.setattr(admin_routes, "SupabaseClient", lambda: FailingSignOut())
    app.dependency_overrides[verify_admin_token] = lambda: types.SimpleNamespace(email=ADMIN_EMAIL)
    try:
        response = client.post("/api/admin/logout", headers={"Authorization": "Bearer t"})
    finally:
        app.dependency_overrides.pop(verify_admin_token, None)
    assert response.status_code == 500
    assert "abc123" not in response.text


# --- Health ---------------------------------------------------------------

def test_liveness_caches_the_database_probe(client, monkeypatch):
    """Every public hit ran a service-role query."""
    calls = {"n": 0}

    async def fake_probe(deadline_seconds=None):
        calls["n"] += 1
        return True, {"status": "operational", "connection": "connected"}

    monkeypatch.setattr(health_routes, "_check_database", fake_probe)
    for _ in range(3):
        body = client.get("/api/health").json()
        # The contract helpers/deploy.sh greps for.
        assert body["status"] == "healthy"
        assert body["checks"]["database"]["status"] == "operational"
        assert body["checks"]["version"]["hash"]
    assert calls["n"] == 1


def test_liveness_does_not_wait_on_a_hanging_database(client, monkeypatch):
    """The SDK's 120s default outlived the 3s startup-probe deadline."""

    class HangingQuery:
        def __getattr__(self, _name):
            return lambda *a, **k: self

        def execute(self):
            time.sleep(1.0)

    class HangingClient:
        def table(self, _name):
            return HangingQuery()

    monkeypatch.setattr(
        health_routes, "SupabaseClient", lambda: types.SimpleNamespace(get_admin_client=HangingClient)
    )
    monkeypatch.setattr(health_routes, "DB_PROBE_TIMEOUT_SECONDS", 0.1)

    started = time.monotonic()
    response = client.get("/api/health")
    elapsed = time.monotonic() - started
    assert response.status_code == 200
    assert response.json()["status"] == "degraded"
    assert elapsed < 0.9


def test_readiness_still_fails_closed(client, monkeypatch):
    async def failing_probe(deadline_seconds=None):
        return False, {"status": "failed", "connection": "disconnected"}

    monkeypatch.setattr(health_routes, "_check_database", failing_probe)
    assert client.get("/api/health/ready").status_code == 503


def test_version_info_carries_no_error_text():
    assert "error" not in health_routes.VERSION_INFO
    assert set(health_routes.VERSION_INFO) <= {"hash", "source"}


# --- Error bodies and config ----------------------------------------------

@pytest.fixture
def broken_skills_file(monkeypatch, tmp_path):
    """Point the loaders at a corrupt skills.json with cold caches."""
    (tmp_path / "skills.json").write_text('{"python": {"secret parser detail": ')
    monkeypatch.setattr(data_loader, "DATA_DIR", tmp_path)
    data_loader.load_skills.cache_clear()
    content.collection_payload.cache_clear()
    content.item_payloads.cache_clear()
    yield
    monkeypatch.undo()
    data_loader.load_skills.cache_clear()
    content.collection_payload.cache_clear()
    content.item_payloads.cache_clear()


@pytest.mark.parametrize("path", ["/api/skills", "/api/skills/python"])
def test_content_routes_return_generic_500s(client, broken_skills_file, path):
    response = client.get(path)
    assert response.status_code == 500
    assert response.json() == {"detail": "Unable to load site content"}
    assert "secret" not in response.text and str(data_loader.DATA_DIR) not in response.text
    assert "public" not in response.headers.get("Cache-Control", "")


def test_unread_env_vars_are_not_required():
    """PRODUCTION_URL and RESUME_FILE were required to boot but never read."""
    assert "PRODUCTION_URL" not in config.REQUIRED_ENV_VARS
    assert "RESUME_FILE" not in config.REQUIRED_ENV_VARS
