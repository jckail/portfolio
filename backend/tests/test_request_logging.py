"""Request ID middleware and JSON log formatter."""
import json
import logging

from app.utils.json_log import JsonFormatter
from app.utils.request_context import clear_request_id, get_request_id, set_request_id


def test_security_headers_include_request_id(client):
    response = client.get("/api/health")
    assert "X-Request-ID" in response.headers
    assert len(response.headers["X-Request-ID"]) >= 8


def test_incoming_request_id_is_echoed(client):
    response = client.get(
        "/api/health", headers={"X-Request-ID": "client-corr-123"}
    )
    assert response.headers["X-Request-ID"] == "client-corr-123"


def test_request_context_round_trip():
    clear_request_id()
    assert get_request_id() is None
    rid = set_request_id("abc")
    assert rid == "abc"
    assert get_request_id() == "abc"
    clear_request_id()
    assert get_request_id() is None


def test_json_formatter_includes_request_id():
    set_request_id("req-xyz")
    try:
        record = logging.LogRecord(
            name="quickresume",
            level=logging.INFO,
            pathname="test.py",
            lineno=1,
            msg="hello %s",
            args=("world",),
            exc_info=None,
        )
        payload = json.loads(JsonFormatter().format(record))
        assert payload["message"] == "hello world"
        assert payload["level"] == "INFO"
        assert payload["request_id"] == "req-xyz"
        assert "timestamp" in payload
    finally:
        clear_request_id()
