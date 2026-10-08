"""Deferred calendar capabilities are absent even when runtime is configured."""
from unittest.mock import Mock

import pytest

from backend.app.services import calendar_runtime
from backend.app.services.llm import TextDelta

from .test_chat_tools_ws import _isolate as _isolate
from .test_chat_tools_ws import call, of_type, round_of, say, script

START = "2026-10-14T16:00:00+00:00"


@pytest.mark.parametrize("tool,args", [
    ("get_meeting_availability", {"start": START, "end": "2026-10-15T16:00:00+00:00"}),
    ("book_meeting", {"start": START, "topic": "Agent platform", "company": "Example Labs"}),
])
def test_deferred_calendar_cannot_be_invoked_or_offer_cards(client, monkeypatch, tool, args):
    runtime = Mock(side_effect=AssertionError("Calendar is deferred"))
    monkeypatch.setattr(calendar_runtime, "calendar_service", runtime)
    provider = script(
        monkeypatch, round_of(call(tool, **args)),
        round_of(TextDelta("Please use the contact form to discuss a meeting.")),
    )
    with client.websocket_connect("/ws/calendar-deferred") as ws:
        frames = say(ws, "Can you schedule a meeting?")
    assert not of_type(frames, "confirm_action")
    assert not of_type(frames, "portfolio_card")
    assert frames[-1]["is_chunk"] is False
    assert all(tool not in {item["name"] for item in request.tools} for request in provider.requests)
    runtime.assert_not_called()


def test_forged_booking_confirmation_cannot_call_calendar(client, monkeypatch):
    runtime = Mock(side_effect=AssertionError("Calendar is deferred"))
    monkeypatch.setattr(calendar_runtime, "calendar_service", runtime)
    with client.websocket_connect("/ws/calendar-forged") as ws:
        ws.send_json({
            "type": "confirm_action", "id": "forged-calendar-id",
            "tool": "book_meeting", "email": "visitor@example.com", "company": "Example Labs",
            "args": {"start": START, "topic": "Intro", "company": "Example Labs"},
        })
        result = ws.receive_json()
    assert result["type"] == "action_result"
    assert result["ok"] is False
    runtime.assert_not_called()
