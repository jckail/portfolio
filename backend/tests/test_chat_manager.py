"""Unit tests for the chat ConnectionManager (no network calls)."""
import json

from backend.app.services.chat_service import (
    MAX_HISTORY_MESSAGES,
    MAX_PAGE_CONTEXT_CHARS,
    RATE_LIMIT_MAX_MESSAGES,
    ConnectionManager,
)


def make_manager() -> ConnectionManager:
    return ConnectionManager()


def test_history_is_capped_and_starts_with_user():
    manager = make_manager()
    for i in range(MAX_HISTORY_MESSAGES + 7):
        role = "user" if i % 2 == 0 else "assistant"
        manager.append_to_history("c1", role, f"message {i}")

    history = manager.get_history("c1")
    assert len(history) <= MAX_HISTORY_MESSAGES
    assert history[0]["role"] == "user"


def test_rate_limit_kicks_in():
    manager = make_manager()
    results = [manager.is_rate_limited("c1") for _ in range(RATE_LIMIT_MAX_MESSAGES + 1)]
    assert results[:RATE_LIMIT_MAX_MESSAGES] == [False] * RATE_LIMIT_MAX_MESSAGES
    assert results[-1] is True
    # Other clients are unaffected
    assert manager.is_rate_limited("c2") is False


def test_store_context_extracts_text_from_json():
    manager = make_manager()
    manager.store_context("c1", json.dumps({"text": "About page", "html": "<div>...</div>"}))
    assert manager.get_context("c1") == "About page"


def test_store_context_truncates_and_handles_plain_strings():
    manager = make_manager()
    manager.store_context("c1", "x" * (MAX_PAGE_CONTEXT_CHARS + 500))
    assert len(manager.get_context("c1")) == MAX_PAGE_CONTEXT_CHARS


def test_disconnect_clears_client_state():
    manager = make_manager()
    manager.append_to_history("c1", "user", "hi")
    manager.store_context("c1", "context")
    manager.is_rate_limited("c1")
    manager.disconnect("c1")
    assert manager.get_history("c1") == []
    assert manager.get_context("c1") == ""
