"""chat_tools: argument bounds, search_portfolio, pending-action lifecycle, execution.

SendGrid is faked at the owner-mail boundary; nothing here touches the network.
"""
import asyncio
import dataclasses
import functools
import types

import pytest

from backend.app import config
from backend.app.api import contact_routes
from backend.app.services import chat_tools
from backend.app.services.owner_mail import OwnerMailFailed, OwnerMailNotConfigured

PHONE = "555-0100"


@pytest.fixture(autouse=True)
def _limits():
    contact_routes._email_limiter.reset()
    contact_routes._phone_limiter.reset()
    yield
    contact_routes._email_limiter.reset()
    contact_routes._phone_limiter.reset()


@pytest.fixture
def mail(monkeypatch):
    sent = []
    state = {"raises": None}

    async def fake_send(**kwargs):
        if state["raises"] is not None:
            raise state["raises"]
        sent.append(kwargs)
        return 202

    monkeypatch.setattr(chat_tools, "send_owner_mail", fake_send)
    settings = dataclasses.replace(config.get_settings(), contact_phone=PHONE)
    monkeypatch.setattr(chat_tools, "get_settings", lambda: settings)
    monkeypatch.setattr(chat_tools, "owner_mail_configured", lambda: True)
    return types.SimpleNamespace(sent=sent, state=state)


def aio(fn):
    """Run an async test body (no async pytest plugin in this repo)."""
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        return asyncio.run(fn(*args, **kwargs))
    return wrapper


# -- registry ---------------------------------------------------------------

def test_registry_kinds_and_strict_schemas():
    kinds = chat_tools.TOOL_KINDS
    assert {n for n, k in kinds.items() if k == "execute"} == {"contact_jordan", "request_phone", "request_meeting", "book_meeting"}
    assert {"open_modal", "navigate_section", "set_theme", "download_resume", "search_portfolio"} <= {
        n for n, k in kinds.items() if k == "read"
    }
    assert {t["name"] for t in chat_tools.ALL_TOOLS} == set(kinds)
    for tool in chat_tools.ALL_TOOLS:
        assert tool["input_schema"]["additionalProperties"] is False, tool["name"]


# -- argument validation ----------------------------------------------------

def test_contact_args_are_trimmed_bounded_and_single_line_subject():
    args = chat_tools.validate_execute_args(
        "contact_jordan",
        {"subject": "Hi\r\nBcc: x@y.z", "message": "m" * 6000, "extra": "dropped"},
        truncate=True,
    )
    assert args["subject"] == "Hi Bcc: x@y.z"
    assert len(args["message"]) == chat_tools.MAX_MESSAGE_CHARS
    assert set(args) == {"subject", "message"}


@pytest.mark.parametrize("raw", [{}, {"subject": "", "message": "x"}, {"subject": "s", "message": 5}, None, "x"])
def test_contact_args_reject_missing_or_wrong_types(raw):
    assert chat_tools.validate_execute_args("contact_jordan", raw, truncate=True) is None


def test_confirmed_args_are_never_silently_truncated():
    too_long = {"subject": "s" * 151, "message": "ok"}
    assert chat_tools.validate_execute_args("contact_jordan", too_long, truncate=False) is None
    assert chat_tools.validate_execute_args("request_meeting", {"topic": "t" * 201}, truncate=False) is None
    assert chat_tools.validate_execute_args(
        "request_meeting", {"topic": "t", "preferred_times": "x" * 501}, truncate=False
    ) is None


def test_meeting_times_are_optional_and_phone_takes_no_args():
    assert chat_tools.validate_execute_args("request_meeting", {"topic": "Chat"}, truncate=False) == {
        "topic": "Chat", "preferred_times": "",
    }
    assert chat_tools.validate_execute_args("request_phone", {"anything": 1}, truncate=False) == {}
    assert chat_tools.validate_execute_args("rm_rf", {}, truncate=False) is None


@pytest.mark.parametrize("bad", ["", "nope", "a@b", "x" * 250 + "@example.com", None, 5, "a@b.co\nBcc: x@y.z"])
def test_email_validation_rejects(bad):
    assert chat_tools.validate_email(bad) is None


def test_email_validation_accepts_normal_address():
    assert chat_tools.validate_email("  visitor@example.com ") == "visitor@example.com"


# -- search_portfolio -------------------------------------------------------

def test_search_finds_grounded_snippets_with_keys():
    result = chat_tools.search_portfolio("agent harness")
    assert result["results"]
    top = result["results"][0]
    assert {"source", "key", "title", "snippets"} <= set(top)
    assert len(result["results"]) <= chat_tools.SEARCH_MAX_RESULTS
    for hit in result["results"]:
        assert len(hit["snippets"]) <= chat_tools.SEARCH_MAX_SNIPPETS
        assert all(len(s) <= chat_tools.SEARCH_SNIPPET_CHARS + 6 for s in hit["snippets"])
    assert any(h["source"] == "experience" and h["key"] == "together_ai" for h in result["results"])


def test_search_covers_skills_and_projects():
    assert any(h["source"] == "skills" for h in chat_tools.search_portfolio("airflow")["results"])
    assert any(h["source"] == "projects" for h in chat_tools.search_portfolio("billing")["results"])


@pytest.mark.parametrize("query", ["", "   ", None, 12, "the and of", ["x"]])
def test_search_without_usable_terms_returns_empty_with_note(query):
    result = chat_tools.search_portfolio(query)
    assert result["results"] == [] and "keywords" in result["note"]


def test_search_no_match_and_oversized_query_are_safe():
    assert chat_tools.search_portfolio("zzzqqqxxxnomatch")["results"] == []
    chat_tools.search_portfolio("python " * 5000)  # bounded, must not blow up


def test_search_never_returns_links_or_contact_data():
    blob = str(chat_tools.search_portfolio("jordan engineer data platform python"))
    assert "http" not in blob and "@" not in blob


# -- pending actions --------------------------------------------------------

def test_pending_ids_are_random_single_use_and_expire(monkeypatch):
    store = chat_tools.PendingActions()
    first = store.create("request_phone", {})
    second = store.create("request_phone", {})
    assert first.id != second.id and len(first.id) >= 20
    assert store.take(first.id)[0] is first
    assert store.take(first.id) == (None, "unknown")  # replay
    assert store.take("forged") == (None, "unknown")
    assert store.take(None) == (None, "unknown")
    assert store.take("x" * 500) == (None, "unknown")

    clock = {"t": 1000.0}
    monkeypatch.setattr(chat_tools, "_now", lambda: clock["t"])
    fresh = chat_tools.PendingActions()
    action = fresh.create("request_phone", {})
    clock["t"] += chat_tools.PENDING_TTL_SECONDS + 1
    assert fresh.take(action.id) == (None, "expired")


def test_pending_store_caps_open_actions_and_purges_expired(monkeypatch):
    clock = {"t": 0.0}
    monkeypatch.setattr(chat_tools, "_now", lambda: clock["t"])
    store = chat_tools.PendingActions()
    for _ in range(chat_tools.MAX_PENDING_PER_CONNECTION):
        assert store.create("request_phone", {})
    assert store.create("request_phone", {}) is None
    assert chat_tools.pending_tool_result(None)["status"] == "not_created"
    clock["t"] += chat_tools.PENDING_TTL_SECONDS + 1
    assert store.create("request_phone", {}) is not None


def test_pending_result_tells_the_model_nothing_was_sent():
    action = chat_tools.PendingAction("i", "contact_jordan", {}, 0)
    result = chat_tools.pending_tool_result(action)
    assert result["status"] == "pending_visitor_confirmation"
    assert "Do not claim success" in result["note"]


# -- execution --------------------------------------------------------------

@aio
async def test_contact_sends_to_owner_with_reply_to_and_escapes_html(mail):
    outcome = await chat_tools.execute_confirmed(
        "contact_jordan", {"subject": "Hello", "message": "<b>hi</b>"}, "visitor@example.com", "1.1.1.1"
    )
    assert outcome.ok and outcome.phone is None
    (sent,) = mail.sent
    assert sent["reply_to"] == "visitor@example.com"
    assert "<b>hi</b>" not in sent["html"] and "&lt;b&gt;" in sent["html"]
    assert sent["subject"] == "Jordan Kail: Hello"


@aio
async def test_meeting_sends_and_uses_email_limiter(mail):
    outcome = await chat_tools.execute_confirmed(
        "request_meeting", {"topic": "Agents", "preferred_times": "Tue PM"}, "v@example.com", "1.1.1.2"
    )
    assert outcome.ok
    assert "Agents" in mail.sent[0]["plain_text"] and "Tue PM" in mail.sent[0]["plain_text"]


@aio
async def test_phone_returns_number_only_after_notification(mail):
    outcome = await chat_tools.execute_confirmed("request_phone", {}, "v@example.com", "1.1.1.3")
    assert outcome.ok and outcome.phone == PHONE
    assert PHONE not in mail.sent[0]["plain_text"]  # the number never goes in the email either
    assert "v@example.com" in mail.sent[0]["plain_text"]


@aio
async def test_phone_unset_fails_without_mail(mail, monkeypatch):
    settings = dataclasses.replace(config.get_settings(), contact_phone="")
    monkeypatch.setattr(chat_tools, "get_settings", lambda: settings)
    outcome = await chat_tools.execute_confirmed("request_phone", {}, "v@example.com", "1.1.1.4")
    assert not outcome.ok and outcome.phone is None and not mail.sent


@pytest.mark.parametrize("error", [OwnerMailFailed(), OwnerMailNotConfigured()])
@aio
async def test_send_failure_is_generic_and_never_leaks_the_phone(mail, error):
    mail.state["raises"] = error
    for tool, args in (
        ("request_phone", {}),
        ("contact_jordan", {"subject": "s", "message": "m"}),
        ("request_meeting", {"topic": "t"}),
    ):
        outcome = await chat_tools.execute_confirmed(tool, args, "v@example.com", "2.2.2.2")
        assert not outcome.ok and outcome.phone is None
        assert PHONE not in outcome.message and "SendGrid" not in outcome.message


@aio
async def test_invalid_email_or_args_send_nothing(mail):
    bad_email = await chat_tools.execute_confirmed("request_phone", {}, "not-an-email", "3.3.3.3")
    bad_args = await chat_tools.execute_confirmed("contact_jordan", {"subject": ""}, "v@example.com", "3.3.3.3")
    assert not bad_email.ok and not bad_args.ok and not mail.sent


@aio
async def test_rest_limiters_are_shared_and_enforced(mail):
    for _ in range(3):
        assert (await chat_tools.execute_confirmed("request_phone", {}, "v@example.com", "4.4.4.4")).ok
    blocked = await chat_tools.execute_confirmed("request_phone", {}, "v@example.com", "4.4.4.4")
    assert not blocked.ok and blocked.phone is None and len(mail.sent) == 3
    # The same instance the REST route uses is now exhausted for that address.
    assert not contact_routes._phone_limiter.check("4.4.4.4")
    # Contact and phone have separate budgets, like the REST routes.
    assert (await chat_tools.execute_confirmed(
        "contact_jordan", {"subject": "s", "message": "m"}, "v@example.com", "4.4.4.4")).ok


def test_prompt_carries_a_skills_index_not_the_full_skill_data():
    from backend.app.services.chat_service import manager

    data = manager._system_parts()[2]
    assert "search_portfolio" in data
    assert "python: Python" in data  # index line
    assert "related" not in data.split('"skills"')[1]  # per-skill detail left to search
    assert len(data) < 60_000
