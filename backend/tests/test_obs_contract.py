"""Observability contract, offline.

Three things are checked here, because each one fails silently in production:

1. Drift: every event the Terraform metrics, alerts and dashboard name is
   emitted by backend code, and every emitted event has a metric.
2. Shape: real requests produce JSON lines with the fields Cloud Logging reads
   (severity, trace, request_id, event, serviceContext, stack_trace).
3. Matching: a small evaluator for the Cloud Logging filter shapes used in
   ``infra/`` is run over those captured lines, so a metric whose filter can
   never match what the app writes is caught without deploying.

Plus a PII fuzz: emails, phone-like numbers, tokens and IPs sent in bodies,
headers, paths and queries must not appear in any captured log line.
"""
from __future__ import annotations

import ast
import json
import logging
import re
import types
from pathlib import Path

import pytest

from backend.app.api import admin_routes, contact_routes, events_routes
from backend.app.services import owner_mail
from backend.app.utils import metrics
from backend.app.utils.events import KNOWN_EVENTS, log_event
from backend.app.utils.json_log import JsonFormatter
from backend.app.utils.logger import DropPeerAddressLines

ROOT = Path(__file__).resolve().parents[2]
INFRA = ROOT / "infra"
APP = ROOT / "backend" / "app"
SERVICE = "quickresume"
TRACE_HEADER = "105445aa7843bc8bf206b12000100000/5;o=1"
TRACE_ID = "105445aa7843bc8bf206b12000100000"


# ---------------------------------------------------------------------------
# Terraform parsing
# ---------------------------------------------------------------------------

def _tf(name: str) -> str:
    return (INFRA / name).read_text(encoding="utf-8")


def tf_app_events() -> dict[str, list[str]]:
    """The ``app_events`` local: event name => extracted label names."""
    block = re.search(r"app_events\s*=\s*\{(.*?)\n  \}", _tf("observability.tf"), re.S)
    assert block, "locals.app_events not found in infra/observability.tf"
    out = {}
    for name, labels in re.findall(r'"([a-z_]+\.[a-z_]+)"\s*=\s*\[([^\]]*)\]', block.group(1)):
        out[name] = re.findall(r'"([^"]+)"', labels)
    return out


def tf_referenced_events() -> set[str]:
    """Every dotted event name mentioned as a string in alert/dashboard configs."""
    names = set()
    obs = _tf("observability.tf")
    for body in re.findall(r"events\s*=\s*\[([^\]]*)\]", obs):
        names |= set(re.findall(r'"([^"]+)"', body))
    dash = _tf("dashboard.tf")
    names |= set(re.findall(r'local\.metric_type\["([^"]+)"\]', dash))
    for body in re.findall(r"for e in \[([^\]]*)\]", dash):
        names |= set(re.findall(r'"([^"]+)"', body))
    return names


def tf_metric_filter(event: str) -> str:
    """Render the ``app_event`` metric filter for one event (service var defaulted)."""
    obs = _tf("observability.tf")
    start = obs.index('resource "google_logging_metric" "app_event"')
    join = re.search(r'filter\s*=\s*join\(" AND ", \[(.*?)\]\)', obs[start:], re.S)
    assert join, "app_event filter not found"
    parts = re.findall(r'"((?:[^"\\]|\\.)*)"', join.group(1))
    rendered = [p.replace('\\"', '"').replace("${var.service_name}", SERVICE).replace("${each.key}", event)
                for p in parts]
    return " AND ".join(rendered)


# ---------------------------------------------------------------------------
# Emitted events (AST scan of log_event calls)
# ---------------------------------------------------------------------------

def emitted_events() -> dict[str, set[str]]:
    """event name => union of keyword names passed at its call sites."""
    found: dict[str, set[str]] = {}
    for path in APP.rglob("*.py"):
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue
            func = node.func
            fname = func.id if isinstance(func, ast.Name) else func.attr if isinstance(func, ast.Attribute) else ""
            if fname != "log_event" or not node.args:
                continue
            arg = node.args[0]
            assert isinstance(arg, ast.Constant) and isinstance(arg.value, str), (
                f"{path.name}:{node.lineno} log_event name must be a string literal so the contract can be checked"
            )
            found.setdefault(arg.value, set()).update(k.arg for k in node.keywords if k.arg)
    return found


# ---------------------------------------------------------------------------
# A tiny Cloud Logging filter evaluator (the shapes used in infra/)
# ---------------------------------------------------------------------------

SEVERITY = {"DEFAULT": 0, "DEBUG": 100, "INFO": 200, "NOTICE": 300, "WARNING": 400, "ERROR": 500,
            "CRITICAL": 600, "ALERT": 700, "EMERGENCY": 800}
_TOKEN = re.compile(r'\s*(?:(?P<str>"(?:[^"\\]|\\.)*")|(?P<op>=~|!=|!~|>=|<=|[=:<>()])|(?P<word>[^\s()=:<>!~"]+))')


def _tokenize(text: str) -> list[tuple[str, str]]:
    tokens, pos = [], 0
    while pos < len(text):
        if not text[pos:].strip():
            break
        m = _TOKEN.match(text, pos)
        assert m, f"cannot tokenize filter at {text[pos:pos + 30]!r}"
        kind = m.lastgroup
        value = m.group(kind)
        if kind == "str":
            value = value[1:-1].replace('\\"', '"')
        tokens.append((kind, value))
        pos = m.end()
    return tokens


def _lookup(entry: dict, path: str):
    node = entry
    # `logging.googleapis.com/...` style keys contain dots, so try the longest
    # remaining key at each level before splitting further.
    parts = path.split(".")
    i = 0
    while i < len(parts):
        if not isinstance(node, dict):
            return None
        for j in range(len(parts), i, -1):
            key = ".".join(parts[i:j])
            if key in node:
                node, i = node[key], j
                break
        else:
            return None
    return node


def _compare(actual, op: str, expected: str, field: str) -> bool:
    if actual is None:
        return op in ("!=", "!~")
    if field == "severity":
        a, e = SEVERITY[str(actual)], SEVERITY.get(expected.upper())
        assert e is not None, f"unknown severity {expected}"
        return {"=": a == e, "!=": a != e, ">=": a >= e, "<=": a <= e, ">": a > e, "<": a < e}[op]
    text = str(actual)
    if op == "=":
        return text == expected
    if op == "!=":
        return text != expected
    if op == ":":
        return expected.lower() in text.lower()
    if op == "=~":
        return re.search(expected, text) is not None
    if op == "!~":
        return re.search(expected, text) is None
    try:
        a, e = float(text), float(expected)
    except ValueError:
        a, e = text, expected
    return {">=": a >= e, "<=": a <= e, ">": a > e, "<": a < e}[op]


class _Parser:
    """NOT > OR > AND (implicit AND between adjacent terms), as Cloud Logging does."""

    def __init__(self, tokens, entry):
        self.t, self.i, self.entry = tokens, 0, entry

    def peek(self):
        return self.t[self.i] if self.i < len(self.t) else (None, None)

    def eat(self):
        tok = self.t[self.i]
        self.i += 1
        return tok

    def is_kw(self, word):
        k, v = self.peek()
        return k == "word" and v == word

    def parse(self):
        value = self.and_expr()
        assert self.i == len(self.t), f"trailing tokens: {self.t[self.i:]}"
        return value

    def and_expr(self):
        value = self.or_expr()
        while self.i < len(self.t) and self.peek() != ("op", ")"):
            if self.is_kw("AND"):
                self.eat()
            right = self.or_expr()
            value = value and right
        return value

    def or_expr(self):
        value = self.unary()
        while self.is_kw("OR"):
            self.eat()
            right = self.unary()
            value = value or right
        return value

    def unary(self):
        if self.is_kw("NOT") or self.peek() == ("op", "-"):
            self.eat()
            return not self.unary()
        return self.primary()

    def primary(self):
        kind, value = self.eat()
        if (kind, value) == ("op", "("):
            inner = self.and_expr()
            assert self.eat() == ("op", ")")
            return inner
        assert kind == "word", f"unexpected token {kind}:{value}"
        if self.peek() == ("op", "("):  # function: log_id("x")
            self.eat()
            arg = self.eat()[1]
            assert self.eat() == ("op", ")")
            assert value == "log_id", f"unsupported function {value}"
            return str(self.entry.get("logName", "")).endswith("%2F" + arg.replace("/", "%2F")) or \
                str(self.entry.get("logName", "")).endswith("/" + arg.replace("/", "%2F"))
        op = self.eat()[1]
        operand = self.eat()[1]
        return _compare(_lookup(self.entry, value), op, operand, value)


def matches(filter_text: str, entry: dict) -> bool:
    return _Parser(_tokenize(filter_text), entry).parse()


def to_entry(line: str, log_name: str = "run.googleapis.com%2Fstdout") -> dict:
    """What Cloud Run makes of one stdout JSON line."""
    payload = json.loads(line)
    return {
        "logName": f"projects/portfolio-383615/logs/{log_name}",
        "resource": {"type": "cloud_run_revision", "labels": {"service_name": SERVICE}},
        "severity": payload.get("severity", "DEFAULT"),
        "jsonPayload": payload,
    }


# --- evaluator self-tests ---------------------------------------------------

E = {"severity": "ERROR", "resource": {"type": "cloud_run_revision", "labels": {"service_name": "s"}},
     "jsonPayload": {"event": "a.b", "n": 3, "logging.googleapis.com/trace": "t"}}


@pytest.mark.parametrize("expr,expected", [
    ('jsonPayload.event="a.b"', True),
    ('jsonPayload.event="a.c"', False),
    ("severity>=ERROR", True),
    ("severity>=CRITICAL", False),
    ('jsonPayload.event="a.c" OR severity>=ERROR', True),
    ('resource.type="cloud_run_revision" AND NOT jsonPayload.event="x"', True),
    ('resource.type="cloud_run_revision"\nresource.labels.service_name="s"', True),
    ('jsonPayload.event:"a." AND (severity=INFO OR severity=ERROR)', True),
    ('jsonPayload.event=~"^a\\.b$"', True),
    ('jsonPayload.n>2', True),
    ('jsonPayload.missing="x"', False),
    ('NOT jsonPayload.missing="x"', True),
    ('jsonPayload.logging.googleapis.com/trace="t"', True),
])
def test_filter_evaluator(expr, expected):
    assert matches(expr, E) is expected


# ---------------------------------------------------------------------------
# 1. Static drift checks
# ---------------------------------------------------------------------------

def test_terraform_events_equal_known_events():
    assert set(tf_app_events()) == set(KNOWN_EVENTS)


def test_every_event_terraform_references_is_defined():
    assert tf_referenced_events() <= set(tf_app_events())


def test_every_known_event_is_emitted_by_backend_code_and_vice_versa():
    emitted = emitted_events()
    assert set(emitted) == set(KNOWN_EVENTS), (
        f"never emitted: {sorted(set(KNOWN_EVENTS) - set(emitted))}; "
        f"emitted but not in KNOWN_EVENTS: {sorted(set(emitted) - set(KNOWN_EVENTS))}"
    )


def test_label_extractors_are_passed_by_every_call_site_or_the_event_has_none():
    emitted = emitted_events()
    for event, labels in tf_app_events().items():
        for label in labels:
            assert label in emitted[event], f"{event}: label {label!r} is never passed to log_event"


def test_metric_label_names_survive_the_pii_sanitiser():
    from backend.app.utils.events import sanitize_fields

    for event, labels in tf_app_events().items():
        assert set(sanitize_fields({label: "x" for label in labels})) == set(labels), event


def test_dashboard_panels_group_only_by_labels_their_metric_extracts():
    labels = tf_app_events()
    dash = _tf("dashboard.tf")
    panels = re.findall(r'local\.metric_type\["([^"]+)"\][^\n]*\n\s*aligner[^\n]*group = \["metric\.labels\.(\w+)"\]', dash)
    assert panels, "no grouped event panels found; update this test if the dashboard layout changed"
    for event, label in panels:
        assert label in labels[event], f"dashboard groups {event} by {label}, which it does not extract"


# ---------------------------------------------------------------------------
# 2-4. Captured lines
# ---------------------------------------------------------------------------

class _Capture(logging.Handler):
    def __init__(self):
        super().__init__(logging.DEBUG)
        self.lines: list[str] = []
        self.setFormatter(JsonFormatter())

    def emit(self, record):
        self.lines.append(self.format(record))


@pytest.fixture
def capture():
    cap = _Capture()
    root = logging.getLogger("backend")
    old_level = root.level
    root.setLevel(logging.INFO)
    root.addHandler(cap)
    metrics.reset()
    for limiter in (events_routes._events_limiter, contact_routes._email_limiter, contact_routes._phone_limiter,
                    admin_routes._login_ip_limiter, admin_routes._login_global_limiter):
        limiter.reset()
    yield cap
    root.removeHandler(cap)
    root.setLevel(old_level)


class _FakeSendGrid:
    raises: Exception | None = RuntimeError("provider down")

    def __init__(self, _key):
        pass

    def send(self, _message):
        if _FakeSendGrid.raises:
            raise _FakeSendGrid.raises
        return types.SimpleNamespace(status_code=202)


@pytest.fixture
def fake_mail(monkeypatch):
    monkeypatch.setattr(owner_mail, "SendGridAPIClient", _FakeSendGrid)


def _payloads(cap: _Capture, event: str | None = None):
    out = [json.loads(line) for line in cap.lines]
    return [p for p in out if event is None or p.get("event") == event]


def _drive_real_events(client, cap):
    """Trigger the events that have an offline trigger, with a trace header."""
    h = {"X-Cloud-Trace-Context": TRACE_HEADER}
    # failed admin login: the email gate refuses before any Supabase call
    assert client.post("/api/admin/login", json={"email": "nobody@example.com", "password": "pw"}, headers=h
                       ).status_code == 401
    # contact failure (fake SendGrid raises) -> contact.failed + ERROR access line
    body = {"company": "Private Example Labs", "from_email": "visitor@example.com", "subject": "s", "message": "m"}
    assert client.post("/api/contact/send-email", json=body, headers=h).status_code == 502
    # rate-limit block
    contact_routes._email_limiter.max_events = 1
    try:
        assert client.post("/api/contact/send-email", json=body, headers=h).status_code == 429
    finally:
        contact_routes._email_limiter.max_events = 3
    # product event
    assert client.post("/api/events", json={"event": "section_view", "props": {"section": "about"}},
                       headers=h).status_code == 204
    # websocket origin rejection
    from starlette.websockets import WebSocketDisconnect
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws/AAAAAAAAAA", headers={"origin": "http://evil.example", **h}):
            pass


REAL_TRIGGERS = {"auth.login_failed", "contact.failed", "rate_limit.blocked", "event.received",
                 "ws.rejected_origin"}


def test_real_requests_emit_cloud_logging_shaped_lines(client, capture, fake_mail):
    _drive_real_events(client, capture)
    payloads = _payloads(capture)
    seen = {p["event"] for p in payloads if "event" in p and p["event"] != "http.request"}
    assert REAL_TRIGGERS <= seen
    for p in payloads:
        assert p["severity"] in SEVERITY and p["message"]
        if p.get("event") == "http.request":
            assert p["httpRequest"]["status"] and p["route"].startswith("/") or p["route"] in ("unmatched", "static")
    # trace + request id on the HTTP-triggered lines
    for name in ("auth.login_failed", "contact.failed", "event.received", "http.request"):
        for p in _payloads(capture, name):
            assert p["logging.googleapis.com/trace"] == f"projects/portfolio-383615/traces/{TRACE_ID}", name
            assert p["logging.googleapis.com/spanId"] == "0000000000000005"
            assert p["logging.googleapis.com/trace_sampled"] is True
            assert p["request_id"], name
    # the websocket rejection happens outside a request id but still carries the trace
    ws = _payloads(capture, "ws.rejected_origin")[0]
    assert ws["logging.googleapis.com/trace"].endswith(TRACE_ID)
    # ERROR lines carry serviceContext; INFO lines do not
    errors = [p for p in payloads if p["severity"] == "ERROR"]
    assert errors, "the 502 should log at ERROR"
    for p in errors:
        assert p["serviceContext"]["service"] and p["serviceContext"]["version"]
    assert all("serviceContext" not in p for p in payloads if p["severity"] == "INFO")


def test_exception_lines_carry_stack_trace_service_context_and_trace(capture):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    from backend.app.config import get_settings
    from backend.app.middleware.access_log import AccessLogMiddleware

    app = FastAPI()
    app.add_middleware(AccessLogMiddleware, settings=get_settings())

    @app.get("/api/boom")
    async def boom():
        raise RuntimeError("kaboom")

    with TestClient(app, raise_server_exceptions=False) as c:
        assert c.get("/api/boom", headers={"X-Cloud-Trace-Context": TRACE_HEADER}).status_code == 500
    err = next(p for p in _payloads(capture) if p.get("stack_trace"))
    assert "RuntimeError: kaboom" in err["stack_trace"]
    assert "RuntimeError: kaboom" in err["message"]  # Error Reporting reads the trace from message
    assert err["serviceContext"] == {"service": get_settings().service_name,
                                     "version": get_settings().git_commit or "unknown"}
    assert err["@type"].endswith("ReportedErrorEvent")
    assert err["severity"] == "ERROR"
    assert err["logging.googleapis.com/trace"].endswith(TRACE_ID)
    # and the access line for the same request is ERROR with status 500
    access = [p for p in _payloads(capture, "http.request") if p["httpRequest"]["status"] == 500]
    assert access and access[0]["severity"] == "ERROR"


def _sample_lines(client, capture) -> list[str]:
    """Real lines for the triggerable events, plus formatter-produced lines for the rest."""
    _drive_real_events(client, capture)
    real = {p["event"] for p in _payloads(capture) if "event" in p}
    for event, labels in tf_app_events().items():
        if event not in real:
            log_event(event, **{label: "x" for label in labels})
    return list(capture.lines)


def test_every_metric_filter_matches_a_captured_line_and_only_its_own(client, capture, fake_mail):
    entries = [to_entry(line) for line in _sample_lines(client, capture)]
    for event, labels in tf_app_events().items():
        flt = tf_metric_filter(event)
        hits = [e for e in entries if matches(flt, e)]
        assert hits, f"{event}: filter {flt!r} matches no captured line"
        assert {e["jsonPayload"]["event"] for e in hits} == {event}
        for label in labels:  # EXTRACT(jsonPayload.<label>) needs a value
            assert all(e["jsonPayload"].get(label) not in (None, "") for e in hits), (event, label)


def test_metric_filter_ignores_other_services_and_plain_logs(client, capture, fake_mail):
    entry = to_entry(next(line for line in _sample_lines(client, capture) if '"auth.login_failed"' in line
                          and '"event": "auth.login_failed"' in line))
    flt = tf_metric_filter("auth.login_failed")
    assert matches(flt, entry)
    other = json.loads(json.dumps(entry))
    other["resource"]["labels"]["service_name"] = "someone-else"
    assert not matches(flt, other)


def test_http_latency_filter_would_select_run_request_logs_not_app_logs():
    obs = _tf("observability.tf")
    start = obs.index('resource "google_logging_metric" "http_latency"')
    join = re.search(r'filter\s*=\s*join\(" AND ", \[(.*?)\]\)', obs[start:], re.S)
    parts = [p.replace('\\"', '"').replace("${var.service_name}", SERVICE)
             for p in re.findall(r'"((?:[^"\\]|\\.)*)"', join.group(1))]
    flt = " AND ".join(parts)
    request_log = {"logName": "projects/p/logs/run.googleapis.com%2Frequests",
                   "resource": {"type": "cloud_run_revision", "labels": {"service_name": SERVICE}},
                   "httpRequest": {"requestUrl": "https://www.jckail.com/api/skills", "latency": "0.1s"}}
    assert matches(flt, request_log)
    ws = json.loads(json.dumps(request_log))
    ws["httpRequest"]["requestUrl"] = "https://www.jckail.com/ws/abc"
    assert not matches(flt, ws)
    health = json.loads(json.dumps(request_log))
    health["httpRequest"]["requestUrl"] = "https://www.jckail.com/api/health/ready"
    assert not matches(flt, health)
    assert not matches(flt, to_entry('{"severity": "INFO", "event": "x"}'))


# ---------------------------------------------------------------------------
# PII fuzz
# ---------------------------------------------------------------------------

NEEDLES = [
    "fuzz.victim@pii-leak.example", "pii-leak", "(415) 555-0199", "415-555-0199", "4155550199",
    "sk-ant-FUZZTOKEN1234567890", "FUZZTOKEN", "hunter2-FUZZPASS", "FUZZBODY", "FUZZSUBJECT", "FUZZCOOKIE",
    "FUZZQUERY", "FUZZPATH", "FUZZUA", "203.0.113.77", "198.51.100.23",
]


def test_pii_never_reaches_any_log_line(client, capture, fake_mail):
    email, phone, ip = NEEDLES[0], "(415) 555-0199", "203.0.113.77"
    h = {
        "X-Cloud-Trace-Context": TRACE_HEADER,
        "X-Forwarded-For": f"198.51.100.23, {ip}",
        "Authorization": "Bearer sk-ant-FUZZTOKEN1234567890",
        "Cookie": "sid=FUZZCOOKIE",
        "Referer": f"http://x.example/{email}",
        "User-Agent": f"FUZZUA {email}",
        "X-Request-ID": email,
    }
    client.post("/api/admin/login", json={"email": email, "password": "hunter2-FUZZPASS"}, headers=h)
    client.post("/api/contact/send-email", headers=h, json={
        "company": "Private Example Labs", "from_email": email, "subject": f"FUZZSUBJECT {phone}", "message": f"FUZZBODY call {phone} {ip}"})
    client.post("/api/contact/phone", headers=h, json={"email": email})
    client.post("/api/events", headers=h, json={"event": "section_view", "props": {
        "section": email, "email": email, "phone": phone, "ip": ip, "project": "FUZZBODY", "token": "FUZZTOKEN"}})
    client.post("/api/events", headers=h, json={"event": f"bad {email}"})
    client.post("/api/events", headers=h, content=f"not json {email} {phone}")
    client.get(f"/api/{email}/{ip}/FUZZPATH?token=FUZZQUERY&phone=4155550199", headers=h)
    client.get(f"/api/projects/{email}?x={phone}", headers=h)
    client.get(f"/{email}/FUZZPATH?email={email}", headers=h)
    client.get("/api/skills?skill=" + email, headers=h)
    from starlette.websockets import WebSocketDisconnect
    for path in (f"/ws/{email}", f"/ws/FUZZPATH{ip}"):
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect(path, headers={"origin": f"http://{email}", **h}):
                pass
    # sanitiser last line of defence: callers that pass PII as field values
    log_event("event.received", name=email, section=f"{phone} {ip}", tool="sk-ant-FUZZTOKEN1234567890")
    log_event("rate_limit.blocked", limiter=email)
    log_event("event.received", name=f"call {phone}", section=f"v{ip}x", tool="4155550199")

    assert capture.lines, "nothing was captured"
    dumped = "\n".join(capture.lines)
    leaked = [n for n in NEEDLES if n in dumped]
    assert not leaked, f"PII reached the logs: {leaked}"
    # IP-looking literals in general, not only our needles
    assert not re.findall(r"(?<![\d.])\d{1,3}(?:\.\d{1,3}){3}(?![\d.])", dumped)


# ---------------------------------------------------------------------------
# uvicorn's WebSocket handshake lines (plain text, peer address + raw path)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("message,kept", [
    ('127.0.0.1:41884 - "WebSocket /ws/AAAAAAAAAA" 403', False),
    ('10.1.2.3:5555 - "WebSocket /ws/x" [accepted]', False),
    ('[::1]:5555 - "WebSocket /ws/x" [accepted]', False),
    ("connection open", True),
    ("connection rejected (403 Forbidden)", True),
    ("Started server process [12]", True),
])
def test_peer_address_lines_are_dropped(message, kept):
    record = logging.LogRecord("uvicorn.error", logging.INFO, "x.py", 1, message, (), None)
    assert DropPeerAddressLines().filter(record) is kept


def test_setup_logging_scrubs_uvicorn_loggers():
    from backend.app.utils import logger as logger_module

    logger_module._scrub_server_loggers()
    for name in logger_module._UVICORN_LOGGERS:
        assert any(isinstance(f, DropPeerAddressLines) for f in logging.getLogger(name).filters), name


@pytest.mark.parametrize("value,redacted", [
    ("203.0.113.77", True), ("v10.0.0.1x", True), ("2001:db8::1", True), ("(415) 555-0199", True),
    ("+14155550199", True), ("sk-ant-FUZZTOKEN1234567890", True), ("Bearer abcdef123456", True),
    ("a" * 40, True), ("a@b.co", True),
    ("section_view", False), ("skill_detail", False), ("1-50", False), ("about", False), ("chat.tool_call", False), ("auth", False),
    ("contact_email", False), ("open_project", False), ("v1.2.3", False),
])
def test_event_values_that_look_like_pii_are_redacted(value, redacted):
    from backend.app.utils.events import sanitize_fields

    out = sanitize_fields({"name": value})["name"]
    assert (out == "[redacted]") is redacted
