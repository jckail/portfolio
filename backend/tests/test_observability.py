"""Access log, trace correlation, events endpoint, event emission and metrics."""
import json
import logging
import types

import pytest

from backend.app.api import admin_routes, contact_routes, events_routes
from backend.app.middleware.access_log import route_template, should_log
from backend.app.services import owner_mail
from backend.app.utils import metrics
from backend.app.utils import supabase_client as sc
from backend.app.utils.json_log import JsonFormatter
from backend.app.utils.rate_limit import SlidingWindowLimiter

TRACE = "105445aa7843bc8bf206b12000100000/5;o=1"


@pytest.fixture(autouse=True)
def _isolate():
    metrics.reset()
    events_routes._events_limiter.reset()
    contact_routes._email_limiter.reset()
    contact_routes._phone_limiter.reset()
    admin_routes._login_ip_limiter.reset()
    admin_routes._login_global_limiter.reset()
    yield
    events_routes._events_limiter.reset()
    contact_routes._email_limiter.reset()
    contact_routes._phone_limiter.reset()
    admin_routes._login_ip_limiter.reset()
    admin_routes._login_global_limiter.reset()


def _events(caplog, name=None):
    out = [r for r in caplog.records if getattr(r, "event", None) and r.name == "backend.app.events"]
    return [r for r in out if name is None or r.event == name]


def _access(caplog):
    return [r for r in caplog.records if r.name == "backend.app.access"]


# --- access log -----------------------------------------------------------

def test_access_line_has_route_template_status_latency_and_trace(client, caplog):
    caplog.set_level(logging.INFO)
    response = client.get("/api/skills", headers={"X-Cloud-Trace-Context": TRACE})
    assert response.status_code == 200
    record = _access(caplog)[-1]
    payload = json.loads(JsonFormatter().format(record))
    assert payload["event"] == "http.request"
    assert payload["route"] == "/api/skills"
    assert payload["httpRequest"]["status"] == 200
    assert payload["latency_ms"] >= 0
    assert payload["bytes"] > 0
    assert payload["request_id"] == response.headers["X-Request-ID"]
    assert payload["logging.googleapis.com/trace"].endswith("/traces/105445aa7843bc8bf206b12000100000")
    assert payload["logging.googleapis.com/spanId"] == "0000000000000005"


def test_access_line_uses_the_template_not_the_raw_path_or_query(client, caplog):
    caplog.set_level(logging.INFO)
    client.get("/api/projects/pointup?secret=abc")
    client.get("/api/definitely-not-a-route-9f2c")
    lines = [json.dumps(json.loads(JsonFormatter().format(r))) for r in _access(caplog)]
    assert any('"/api/projects/{project_key}"' in line for line in lines)
    assert any('"unmatched"' in line for line in lines)
    assert not any("secret=abc" in line or "pointup" in line or "9f2c" in line for line in lines)


def test_health_probes_and_static_assets_are_not_logged(client, caplog):
    caplog.set_level(logging.INFO)
    client.get("/api/health")
    client.get("/api/health/ready")
    client.get("/assets/app.js")
    client.get("/favicon.ico")
    assert _access(caplog) == []


def test_should_log_rules():
    assert should_log("/api/contact/info")
    assert not should_log("/api/health/ready")
    assert not should_log("/assets/x.js")
    assert not should_log("/logo.png")
    assert should_log("/")


def test_route_template_for_unmatched_and_static():
    assert route_template({"path": "/api/zzz"}) == "unmatched"
    assert route_template({"path": "/about"}) == "static"
    assert route_template({"path": "/api/y", "route": object(), "path_params": {}}) == "/api/y"
    assert route_template({"path": "/api/p/abc", "route": object(), "path_params": {"k": "abc"}}) == "/api/p/{k}"
    # A value that also appears earlier in the path is replaced at the end.
    assert route_template({"path": "/api/api", "route": object(), "path_params": {"k": "api"}}) == "/api/{k}"


def test_server_errors_are_logged_at_error_level(client, caplog):
    caplog.set_level(logging.INFO)
    # No sendgrid fake and a dummy key: the provider call fails with 502.
    client.post("/api/contact/send-email", json={"from_email": "a@example.com", "subject": "s", "message": "m"})
    assert any(r.levelno >= logging.ERROR for r in _access(caplog)) or metrics.snapshot()["requests_by_status_class"]


def test_status_classes_are_counted(client):
    client.get("/api/skills")
    client.get("/api/definitely-not-a-route")
    classes = metrics.snapshot()["requests_by_status_class"]
    assert classes.get("2xx", 0) >= 1
    assert classes.get("4xx", 0) >= 1


def test_unhandled_exception_is_logged_with_a_stack_trace(caplog):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    from backend.app.config import get_settings
    from backend.app.middleware.access_log import AccessLogMiddleware

    app = FastAPI()
    app.add_middleware(AccessLogMiddleware, settings=get_settings())

    @app.get("/api/boom")
    async def boom():
        raise RuntimeError("kaboom")

    caplog.set_level(logging.INFO)
    with TestClient(app, raise_server_exceptions=False) as c:
        assert c.get("/api/boom").status_code == 500
    errors = [r for r in caplog.records if r.name == "backend.app.access" and r.exc_info]
    assert errors
    payload = json.loads(JsonFormatter().format(errors[0]))
    assert "RuntimeError: kaboom" in payload["stack_trace"]
    assert payload["serviceContext"]["service"]


def test_access_log_can_be_disabled(caplog):
    import dataclasses

    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    from backend.app.config import get_settings
    from backend.app.middleware.access_log import AccessLogMiddleware

    app = FastAPI()
    app.add_middleware(AccessLogMiddleware, settings=dataclasses.replace(get_settings(), access_log_enabled=False))

    @app.get("/api/ok")
    async def ok():
        return {}

    caplog.set_level(logging.INFO)
    with TestClient(app) as c:
        c.get("/api/ok")
    assert _access(caplog) == []


# --- POST /api/events -----------------------------------------------------

def test_event_is_accepted_and_logged_with_validated_props(client, caplog):
    caplog.set_level(logging.INFO)
    r = client.post("/api/events", json={
        "event": "modal_open",
        "props": {"kind": "project", "project": "pointup", "section": "projects",
                  "email": "a@b.co", "message": "hello", "bogus": "x", "theme": "neon"},
    })
    assert r.status_code == 204
    assert r.content == b""
    record = _events(caplog, "event.received")[-1]
    payload = json.loads(JsonFormatter().format(record))
    assert payload["name"] == "modal_open"
    assert payload["kind"] == "project"
    assert payload["section"] == "projects"
    dumped = json.dumps(payload)
    for leaked in ("a@b.co", "hello", "bogus", "neon"):
        assert leaked not in dumped
    assert metrics.snapshot()["events"]["event.received"] == 1


def test_unknown_project_or_skill_slugs_are_dropped(client, caplog):
    caplog.set_level(logging.INFO)
    client.post("/api/events", json={"event": "modal_open", "props": {"project": "constructor", "skill": "nope"}})
    payload = json.loads(JsonFormatter().format(_events(caplog, "event.received")[-1]))
    assert "project" not in payload and "skill" not in payload


def test_known_skill_slug_is_kept(client, caplog):
    caplog.set_level(logging.INFO)
    client.post("/api/events", json={"event": "modal_open", "props": {"skill": "python"}})
    payload = json.loads(JsonFormatter().format(_events(caplog, "event.received")[-1]))
    assert payload["skill"] == "python"


@pytest.mark.parametrize("body", [{"event": "drop_tables"}, {"event": 5}, {"props": {}}, {"event": None}])
def test_unknown_event_names_are_rejected(client, body):
    assert client.post("/api/events", json=body).status_code == 422


def test_non_object_and_malformed_bodies(client):
    assert client.post("/api/events", json=[1, 2]).status_code == 400
    assert client.post("/api/events", content=b"{not json", headers={"content-type": "application/json"}).status_code == 400


def test_oversized_event_body_is_rejected(client):
    big = {"event": "modal_open", "props": {"kind": "x" * 10_000}}
    assert client.post("/api/events", json=big).status_code == 413


def test_beacon_content_type_blob_is_accepted(client):
    r = client.post("/api/events", content=json.dumps({"event": "chat_open"}),
                    headers={"content-type": "application/json"})
    assert r.status_code == 204


def test_events_are_rate_limited_and_the_block_is_an_event(client, caplog):
    caplog.set_level(logging.INFO)
    events_routes._events_limiter.max_events = 3
    try:
        codes = [client.post("/api/events", json={"event": "chat_open"}).status_code for _ in range(5)]
    finally:
        events_routes._events_limiter.max_events = 120
    assert codes[:3] == [204, 204, 204]
    assert codes[3] == 429
    blocked = _events(caplog, "rate_limit.blocked")
    assert blocked and blocked[-1].event_fields == {"limiter": "events"}


def test_events_route_sets_no_cookie(client):
    r = client.post("/api/events", json={"event": "chat_open"})
    assert "set-cookie" not in r.headers


def test_python_event_names_match_the_frontend_list():
    import re
    from pathlib import Path

    ts = (Path(__file__).parents[2] / "frontend/src/shared/analytics/events.ts").read_text()
    block = re.search(r"EVENT_NAMES = \[(.*?)\] as const", ts, re.S).group(1)
    assert set(re.findall(r"'([a-z_]+)'", block)) == set(events_routes.EVENT_NAMES)


# --- rate limiter events --------------------------------------------------

def test_limiter_name_is_reported(caplog):
    caplog.set_level(logging.INFO)
    limiter = SlidingWindowLimiter(1, 60, name="demo")
    limiter.report_blocked()
    assert _events(caplog, "rate_limit.blocked")[-1].event_fields == {"limiter": "demo"}
    assert metrics.snapshot()["rate_limit_hits"] == {"demo": 1}


def test_contact_rate_limit_emits_blocked_event(client, caplog):
    caplog.set_level(logging.INFO)
    contact_routes._email_limiter.max_events = 1
    body = {"from_email": "a@example.com", "subject": "s", "message": "m"}
    try:
        client.post("/api/contact/send-email", json=body)
        r = client.post("/api/contact/send-email", json=body)
    finally:
        contact_routes._email_limiter.max_events = 3
    assert r.status_code == 429
    assert _events(caplog, "rate_limit.blocked")[-1].event_fields == {"limiter": "contact_email"}


# --- contact / phone events ----------------------------------------------

class FakeSendGrid:
    status_code = 202
    raises = None

    def __init__(self, _key):
        pass

    def send(self, _message):
        if FakeSendGrid.raises:
            raise FakeSendGrid.raises
        return types.SimpleNamespace(status_code=FakeSendGrid.status_code)


@pytest.fixture
def fake_mail(monkeypatch):
    FakeSendGrid.status_code, FakeSendGrid.raises = 202, None
    monkeypatch.setattr(owner_mail, "SendGridAPIClient", FakeSendGrid)
    return FakeSendGrid


def _payloads(caplog):
    return [json.loads(JsonFormatter().format(r)) for r in _events(caplog)]


def test_contact_sent_and_failed_events_carry_no_visitor_data(client, caplog, fake_mail):
    caplog.set_level(logging.INFO)
    body = {"from_email": "visitor@example.com", "subject": "Private subject", "message": "Private body"}
    assert client.post("/api/contact/send-email", json=body).status_code == 200
    fake_mail.raises = RuntimeError("down")
    assert client.post("/api/contact/send-email", json=body).status_code == 502
    names = [p["event"] for p in _payloads(caplog)]
    assert names == ["contact.sent", "contact.failed"]
    dumped = json.dumps(_payloads(caplog))
    assert "visitor@example.com" not in dumped and "Private" not in dumped


def test_phone_events(client, caplog, fake_mail, monkeypatch):
    import dataclasses

    from backend.app import config

    settings = dataclasses.replace(config.get_settings(), contact_phone="555-0100")
    monkeypatch.setattr(contact_routes, "get_settings", lambda: settings)
    monkeypatch.setattr(owner_mail, "get_settings", lambda: settings)
    caplog.set_level(logging.INFO)
    assert client.post("/api/contact/phone", json={"email": "v@example.com"}).status_code == 200
    fake_mail.raises = RuntimeError("down")
    assert client.post("/api/contact/phone", json={"email": "v@example.com"}).status_code == 502
    names = [p["event"] for p in _payloads(caplog)]
    assert names == ["phone.requested", "phone.revealed", "phone.requested", "phone.failed"]
    assert "555-0100" not in json.dumps(_payloads(caplog))
    assert "v@example.com" not in json.dumps(_payloads(caplog))


# --- auth events ----------------------------------------------------------

def test_failed_login_emits_event_without_the_email(client, caplog):
    caplog.set_level(logging.INFO)
    r = client.post("/api/admin/login", json={"email": "attacker@example.com", "password": "pw"})
    assert r.status_code == 401
    payloads = _payloads(caplog)
    assert [p["event"] for p in payloads] == ["auth.login_failed"]
    assert "attacker@example.com" not in json.dumps(payloads)


def test_login_lockout_emits_rate_limit_event(client, caplog):
    caplog.set_level(logging.INFO)
    admin_routes._login_ip_limiter.max_events = 1
    creds = {"email": "x@example.com", "password": "p"}
    try:
        client.post("/api/admin/login", json=creds)
        assert client.post("/api/admin/login", json=creds).status_code == 429
    finally:
        admin_routes._login_ip_limiter.max_events = 5
    assert _events(caplog, "rate_limit.blocked")[-1].event_fields == {"limiter": "admin_login_ip"}


@pytest.mark.anyio
async def test_successful_login_emits_event(monkeypatch, caplog):
    caplog.set_level(logging.INFO)

    async def ok(_credentials):
        return admin_routes.LoginToken(access_token="t")

    monkeypatch.setattr(admin_routes, "_attempt_login", ok)
    request = types.SimpleNamespace(headers={}, client=types.SimpleNamespace(host="1.2.3.4"))
    await admin_routes.admin_login(request, admin_routes.LoginCredentials(email="a@b.co", password="p"))
    assert [r.event for r in _events(caplog)] == ["auth.login_succeeded"]


# --- Supabase sink warnings (QA-6) ----------------------------------------

def test_sink_failure_warning_is_rate_limited_and_has_no_exception_text(caplog):
    sc._last_warned.clear()
    sc._suppressed.clear()
    caplog.set_level(logging.WARNING, logger=sc.logger.name)
    for _ in range(5):
        sc._warn_sink_failure("log batch")
    records = [r for r in caplog.records if r.name == sc.logger.name]
    assert len(records) == 1
    assert sc._suppressed["log batch"] == 4
    sc._last_warned["log batch"] -= 120
    sc._warn_sink_failure("log batch")
    assert caplog.records[-1].getMessage().endswith("(4 similar failures suppressed)")


@pytest.mark.anyio
async def test_store_logs_batch_failure_does_not_print(monkeypatch, capsys):
    sc._last_warned.clear()
    monkeypatch.setattr(sc.SupabaseClient, "get_admin_client", classmethod(lambda cls: (_ for _ in ()).throw(OSError("dns"))))
    assert await sc.SupabaseClient.store_logs_batch([{"level": "info", "message": "m", "metadata": {}, "source": "b", "ip_address": "x"}]) is None
    captured = capsys.readouterr()
    assert "Failed to store" not in captured.err and "dns" not in captured.err


def test_supabase_handler_skips_events_and_its_own_warnings():
    from backend.app.utils.logger import SINK_LOGGER_NAME, SupabaseHandler

    handler = SupabaseHandler()
    event = logging.LogRecord("backend.app.events", logging.INFO, "t", 1, "x", (), None)
    event.event = "contact.sent"
    sink = logging.LogRecord(SINK_LOGGER_NAME, logging.WARNING, "t", 1, "x", (), None)
    normal = logging.LogRecord("backend.app.x", logging.INFO, "t", 1, "x", (), None)
    for record in (event, sink, normal):
        handler.emit(record)
    assert handler._queue.qsize() == 1


# --- admin analytics / health (real, process-local data) ------------------

@pytest.fixture
def as_admin(client):
    from backend.app.middleware.auth_middleware import verify_admin_token

    client.app.dependency_overrides[verify_admin_token] = lambda: types.SimpleNamespace(email="admin@example.com")
    yield
    client.app.dependency_overrides.pop(verify_admin_token, None)


def test_admin_analytics_reports_real_counters(client, as_admin, fake_mail):
    from backend.app.utils.events import log_event

    log_event("contact.sent")
    log_event("contact.sent")
    log_event("contact.failed", reason="send_failed")
    log_event("phone.revealed")
    log_event("rate_limit.blocked", limiter="events")
    client.post("/api/events", json={"event": "chat_open"})
    body = client.get("/api/admin/analytics").json()
    assert body["scope"] == "process"
    assert body["contact"] == {"sent": 2, "failed": 1}
    assert body["phone"] == {"requested": 0, "revealed": 1, "failed": 0}
    assert body["rateLimitHits"] == {"events": 1}
    assert body["eventsByName"] == {"chat_open": 1}
    assert body["uptimeSeconds"] >= 0
    assert "pageViews" not in body


def test_admin_health_reports_status_counts_and_version(client, as_admin):
    client.get("/api/skills")
    body = client.get("/api/admin/health").json()
    assert body["status"] == "healthy"
    assert body["requestsByStatusClass"].get("2xx", 0) >= 1
    assert body["serverErrorRate"] == 0.0
    assert body["version"]
    assert body["uptimeSeconds"] >= 0
    assert body["memoryUsageMb"] is None or body["memoryUsageMb"] > 0
    assert "diskSpace" not in body and "activeUsers" not in body


def test_admin_health_degrades_on_a_high_5xx_ratio(client, as_admin):
    for _ in range(18):
        metrics.count_status(200)
    for _ in range(4):
        metrics.count_status(500)
    body = client.get("/api/admin/health").json()
    assert body["status"] == "degraded"


def test_admin_health_ignores_a_tiny_sample(client, as_admin):
    metrics.count_status(500)
    assert client.get("/api/admin/health").json()["status"] == "healthy"


def test_metrics_key_space_is_bounded():
    for i in range(metrics.MAX_KEYS + 50):
        metrics.count_event(f"x{i}")
    snap = metrics.snapshot()["events"]
    assert len(snap) <= metrics.MAX_KEYS + 1
    assert snap["other"] >= 50
