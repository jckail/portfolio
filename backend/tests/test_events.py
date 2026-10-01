"""log_event, the Cloud Logging JSON shape and trace parsing."""
import json
import logging

from backend.app.utils import metrics
from backend.app.utils.events import KNOWN_EVENTS, log_event, sanitize_fields
from backend.app.utils.json_log import JsonFormatter
from backend.app.utils.request_context import clear_trace, parse_trace_header, set_trace


def _record(level=logging.INFO, msg="hello", exc_info=None, **extra):
    record = logging.LogRecord("backend.app.x", level, "t.py", 1, msg, (), exc_info)
    for key, value in extra.items():
        setattr(record, key, value)
    return record


def test_log_event_emits_event_and_fields_at_top_level(caplog):
    metrics.reset()
    with caplog.at_level(logging.INFO, logger="backend.app.events"):
        log_event("rate_limit.blocked", limiter="contact_email")
    record = caplog.records[-1]
    payload = json.loads(JsonFormatter().format(record))
    assert payload["event"] == "rate_limit.blocked"
    assert payload["limiter"] == "contact_email"
    assert payload["severity"] == "INFO"
    snap = metrics.snapshot()
    assert snap["events"]["rate_limit.blocked"] == 1
    assert snap["rate_limit_hits"] == {"contact_email": 1}


def test_sensitive_fields_are_dropped_or_redacted():
    clean = sanitize_fields({
        "email": "a@b.co", "message": "hi", "ip": "1.2.3.4", "api_key": "k",
        "tool": "contact_jordan", "name": "someone@example.com", "len_bucket": "1-50",
    })
    assert clean == {"tool": "contact_jordan", "name": "[redacted]", "len_bucket": "1-50"}


def test_values_are_bounded_and_stripped():
    clean = sanitize_fields({"kind": "x" * 500 + "\n<script>"})
    assert len(clean["kind"]) <= 100
    assert "\n" not in clean["kind"]


def test_every_contract_event_is_known():
    for name in ("auth.login_failed", "chat.budget_exhausted", "event.received", "phone.revealed"):
        assert name in KNOWN_EVENTS


def test_trace_header_is_parsed_into_cloud_logging_fields():
    header = "105445aa7843bc8bf206b12000100000/1;o=1"
    assert parse_trace_header(header) == ("105445aa7843bc8bf206b12000100000", "0000000000000001", True)
    set_trace(header)
    try:
        payload = json.loads(JsonFormatter().format(_record()))
    finally:
        clear_trace()
    assert payload["logging.googleapis.com/trace"] == "projects/portfolio-383615/traces/105445aa7843bc8bf206b12000100000"
    assert payload["logging.googleapis.com/spanId"] == "0000000000000001"
    assert payload["logging.googleapis.com/trace_sampled"] is True


def test_malformed_trace_headers_are_ignored():
    for bad in (None, "", "nothex", "zz5445aa7843bc8bf206b12000100000/1", "short/1"):
        assert parse_trace_header(bad) is None


def test_errors_carry_stack_trace_and_service_context():
    try:
        raise ValueError("boom")
    except ValueError:
        import sys
        record = _record(logging.ERROR, "failed", exc_info=sys.exc_info())
    payload = json.loads(JsonFormatter().format(record))
    assert payload["severity"] == "ERROR"
    assert "ValueError: boom" in payload["stack_trace"]
    assert "ValueError: boom" in payload["message"]
    assert payload["serviceContext"]["service"]
    assert "version" in payload["serviceContext"]
    assert payload["@type"].endswith("ReportedErrorEvent")


def test_info_records_have_no_service_context():
    payload = json.loads(JsonFormatter().format(_record()))
    assert "serviceContext" not in payload
