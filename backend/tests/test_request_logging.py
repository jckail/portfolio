"""Request ID middleware and JSON log formatter."""
import asyncio
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
        # Cloud Logging maps only `severity`
        assert payload["severity"] == "INFO"
        assert payload["request_id"] == "req-xyz"
        assert "timestamp" in payload
    finally:
        clear_request_id()


def test_module_loggers_under_backend_reach_the_configured_handlers(client):
    from backend.app.utils.logger import LOGGER_NAME, get_supabase_handler

    # `client` runs the app, whose import calls setup_logging()
    package_logger = logging.getLogger(LOGGER_NAME)
    assert get_supabase_handler() is not None
    module_logger = logging.getLogger("backend.app.services.chat_service")
    assert module_logger.isEnabledFor(logging.INFO)
    owner = module_logger
    while owner is not None and not owner.handlers:
        owner = owner.parent
    assert owner is package_logger


def test_supabase_handler_captures_request_id_at_emit(monkeypatch):
    # Same module tree as the handler: `app.*` and `backend.app.*` are
    # separate imports with separate context variables.
    from backend.app.utils import logger as logger_module
    from backend.app.utils.request_context import clear_request_id, set_request_id

    handler = logger_module.SupabaseHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))
    record = logging.LogRecord(
        name="backend.app.test", level=logging.INFO, pathname="test.py",
        lineno=1, msg="hello", args=(), exc_info=None,
    )
    set_request_id("req-at-emit")
    try:
        handler.emit(record)
    finally:
        clear_request_id()

    shipped = []

    async def fake_store_logs_batch(logs):
        shipped.extend(logs)
        return logs

    monkeypatch.setattr(logger_module.supabase, "store_logs_batch", fake_store_logs_batch)
    # Flushing happens later, in a context with no request id
    asyncio.run(handler._flush_batch(handler._drain_queue()))
    assert shipped[0]["metadata"]["request_id"] == "req-at-emit"


def test_json_formatter_prefers_request_id_stamped_on_record():
    record = logging.LogRecord(
        name="backend.app.test", level=logging.ERROR, pathname="test.py",
        lineno=1, msg="boom", args=(), exc_info=None,
    )
    record.request_id = "req-stamped"
    payload = json.loads(JsonFormatter().format(record))
    assert payload["request_id"] == "req-stamped"
    assert payload["severity"] == "ERROR"


def test_fallback_log_goes_to_stderr_on_cloud_run(monkeypatch, capsys):
    from backend.app.utils import logger as logger_module

    fallback = logging.getLogger("portfolio_log_fallback")
    saved = fallback.handlers[:]
    fallback.handlers.clear()
    monkeypatch.setattr(logger_module, "ON_CLOUD_RUN", True)
    try:
        logger_module.SupabaseHandler()._fallback_log("could not ship logs")
        assert "could not ship logs" in capsys.readouterr().err
        assert not any(
            isinstance(h, logging.FileHandler) for h in fallback.handlers
        )
    finally:
        fallback.handlers[:] = saved
