"""SupabaseClient wrapper: lazy config, auth error wrapping, and sink failures
that must never raise. The supabase SDK is replaced at the module boundary."""
import asyncio
from unittest.mock import MagicMock

import pytest

from backend.app.utils import supabase_client as sc


@pytest.fixture(autouse=True)
def _reset(monkeypatch):
    monkeypatch.setattr(sc.SupabaseClient, "_regular_client", None)
    monkeypatch.setattr(sc.SupabaseClient, "_admin_client", None)
    monkeypatch.setattr(sc.SupabaseClient, "_url", None)
    monkeypatch.setattr(sc, "_last_warned", {})
    monkeypatch.setattr(sc, "_suppressed", {})


def _run(coro):
    return asyncio.run(coro)


def test_missing_config_raises(monkeypatch):
    settings = MagicMock(supabase_url="", supabase_anon_key="k", supabase_service_role="s")
    monkeypatch.setattr(sc, "get_settings", lambda: settings)
    with pytest.raises(ValueError):
        sc.get_supabase_config()


def test_clients_are_lazy_and_cached(monkeypatch):
    created = []
    monkeypatch.setattr(sc, "create_client", lambda url, key: created.append(key) or MagicMock())
    a = sc.SupabaseClient.get_client()
    assert sc.SupabaseClient.get_client() is a
    admin = sc.SupabaseClient.get_admin_client()
    assert sc.SupabaseClient.get_admin_client() is admin
    assert created == ["test-anon-key", "test-service-role"]


def test_sign_in_wraps_errors(monkeypatch):
    client = MagicMock()
    client.auth.sign_in_with_password.side_effect = RuntimeError("bad creds")
    monkeypatch.setattr(sc, "create_client", lambda *_: client)
    with pytest.raises(Exception, match="Authentication failed"):
        _run(sc.SupabaseClient.sign_in_with_password("a@example.com", "x"))
    client.auth.sign_in_with_password.side_effect = None
    client.auth.sign_in_with_password.return_value = "ok"
    assert _run(sc.SupabaseClient.sign_in_with_password("a@example.com", "x")) == "ok"


def test_sign_out_token_uses_admin_client_and_wraps_errors(monkeypatch):
    client = MagicMock()
    monkeypatch.setattr(sc, "create_client", lambda *_: client)
    _run(sc.SupabaseClient.sign_out("tok"))
    client.auth.admin.sign_out.assert_called_once_with("tok")
    _run(sc.SupabaseClient.sign_out())
    client.auth.sign_out.assert_called_once()
    client.auth.sign_out.side_effect = RuntimeError("boom")
    with pytest.raises(Exception, match="Sign out failed"):
        _run(sc.SupabaseClient.sign_out())


def test_store_log_inserts_uppercased_level(monkeypatch):
    client = MagicMock()
    monkeypatch.setattr(sc, "create_client", lambda *_: client)
    _run(sc.SupabaseClient.store_log("info", "hi", session_uuid="s"))
    row = client.table.return_value.insert.call_args.args[0]
    assert row["level"] == "INFO" and row["metadata"] == {} and row["session_uuid"] == "s"


def test_store_logs_batch_and_empty(monkeypatch):
    client = MagicMock()
    monkeypatch.setattr(sc, "create_client", lambda *_: client)
    assert _run(sc.SupabaseClient.store_logs_batch([])) is None
    client.table.return_value.insert.assert_not_called()
    _run(sc.SupabaseClient.store_logs_batch(
        [{"level": "warn", "message": "m", "metadata": {}, "source": "frontend", "ip_address": None}]
    ))
    rows = client.table.return_value.insert.call_args.args[0]
    assert rows[0]["level"] == "WARN" and rows[0]["source"] == "frontend"


def test_store_chat_message(monkeypatch):
    client = MagicMock()
    monkeypatch.setattr(sc, "create_client", lambda *_: client)
    _run(sc.SupabaseClient.store_chat_message("sess", "sent", "hello"))
    client.table.assert_called_with("portfolio_assistant_messages")


def test_sink_failures_return_none_and_warn_once_per_window(monkeypatch, caplog):
    client = MagicMock()
    client.table.return_value.insert.return_value.execute.side_effect = RuntimeError("secret-url")
    monkeypatch.setattr(sc, "create_client", lambda *_: client)
    with caplog.at_level("WARNING"):
        assert _run(sc.SupabaseClient.store_log("info", "m")) is None
        assert _run(sc.SupabaseClient.store_log("info", "m")) is None
        assert _run(sc.SupabaseClient.store_chat_message("s", "sent", "d")) is None
        assert _run(sc.SupabaseClient.store_logs_batch(
            [{"level": "i", "message": "m", "metadata": {}, "source": "b", "ip_address": None}])) is None
    msgs = [r.getMessage() for r in caplog.records]
    assert sum("log entry" in m for m in msgs) == 1  # second one suppressed
    assert any("chat message" in m for m in msgs) and any("log batch" in m for m in msgs)
    assert not any("secret-url" in m for m in msgs)
    assert sc._suppressed["log entry"] == 1


def test_warning_reports_suppressed_count_after_window(monkeypatch, caplog):
    sc._warn_sink_failure("x")
    sc._warn_sink_failure("x")
    sc._last_warned["x"] -= sc._WARN_INTERVAL_SECONDS + 1
    with caplog.at_level("WARNING"):
        sc._warn_sink_failure("x")
    assert "(1 similar" in caplog.records[-1].getMessage()
