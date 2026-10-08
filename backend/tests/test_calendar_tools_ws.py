"""Real SDK tools expose free slots and book only after a consumed UI confirmation."""
import time

import pytest

from backend.app.services import calendar_runtime
from backend.app.services.calendar_service import CalendarNotConfigured, CalendarUnavailable
from backend.app.services.chat_service import manager
from backend.app.services.llm import TextDelta

from .test_chat_tools_ws import _isolate as _isolate
from .test_chat_tools_ws import call, of_type, round_of, say, script

START = "2026-10-14T16:00:00+00:00"


def test_availability_generates_card_and_tool_evidence(client, monkeypatch):
    class Calendar:
        async def available_slots(self, start, end):
            return {"status": "available", "timezone": "America/Los_Angeles", "slots": [{"start": START, "end": "2026-10-14T16:30:00+00:00"}]}
    monkeypatch.setattr(calendar_runtime, "calendar_service", lambda: Calendar())
    provider = script(monkeypatch, round_of(call("get_meeting_availability", start=START, end="2026-10-15T16:00:00+00:00")),
                      round_of(TextDelta("Choose a slot to review.")))
    with client.websocket_connect("/ws/calendar-availability") as ws:
        frames = say(ws)
    cards = of_type(frames, "portfolio_card")
    assert cards[0]["kind"] == "calendar_availability"
    assert cards[0]["data"]["slots"][0]["start"] == START
    assert provider.requests[1].messages[-1]["results"][0]["output"]["status"] == "available"


def test_booking_requires_confirmation_and_preserves_selected_start(client, monkeypatch):
    booked = []
    class Calendar:
        async def book_confirmed(self, **kwargs):
            booked.append(kwargs)
            return {"status": "booked", "start": kwargs["start"], "timezone": "America/Los_Angeles"}
    monkeypatch.setattr(calendar_runtime, "calendar_service", lambda: Calendar())
    script(monkeypatch, round_of(call("book_meeting", start=START, topic="Agent platform", company="Research Co")),
           round_of(TextDelta("Review the invitation.")))
    with client.websocket_connect("/ws/calendar-confirmation") as ws:
        manager.calendar_offers["calendar-confirmation"] = (time.monotonic(), {START})
        frames = say(ws)
        card = of_type(frames, "confirm_action")[0]
        assert booked == []
        ws.send_json({"type": "confirm_action", "id": card["id"], "email": "visitor@example.com",
                      "args": {"start": "2026-11-01T16:00:00Z", "topic": "Edited topic", "company": "Research Co"}})
        result = ws.receive_json()
        assert result["type"] == "action_result" and result["ok"] is True
        assert "not personally accepted" in result["message"]
        assert booked[0]["start"] == START and booked[0]["confirmation_id"] == card["id"]
        ws.send_json({"type": "confirm_action", "id": card["id"], "email": "visitor@example.com"})
        assert ws.receive_json()["ok"] is False
        assert len(booked) == 1


def test_model_cannot_offer_an_unretrieved_calendar_slot(client, monkeypatch):
    script(monkeypatch, round_of(call("book_meeting", start=START, topic="Intro", company="Co")),
           round_of(TextDelta("Please choose a returned slot first.")))
    with client.websocket_connect("/ws/calendar-invented-slot") as ws:
        frames = say(ws)
    assert not of_type(frames, "confirm_action")


@pytest.mark.parametrize("failure, expected", [
    (CalendarNotConfigured, "not connected"),
    (CalendarUnavailable, "could not verify"),
    (RuntimeError, "could not verify"),
])
def test_unavailable_calendar_ends_with_authoritative_notice(client, monkeypatch, failure, expected):
    class Calendar:
        async def available_slots(self, start, end):
            raise failure("PRIVATE-CALENDAR-DETAIL")
    monkeypatch.setattr(calendar_runtime, "calendar_service", lambda: Calendar())
    provider = script(monkeypatch,
                      round_of(call("get_meeting_availability", start=START, end="2026-10-15T16:00:00+00:00")),
                      round_of(TextDelta("I checked the calendar and there are no slots.")))
    with client.websocket_connect("/ws/calendar-unavailable") as ws:
        frames = say(ws)
    text = "".join(frame.get("message", "") for frame in frames)
    assert len(provider.requests) == 1
    assert expected in text
    assert "nothing is sent without your confirmation" in text
    assert "I checked the calendar" not in text
    assert "PRIVATE-CALENDAR-DETAIL" not in str(frames)
    assert not of_type(frames, "confirm_action")
    assert frames[-1]["is_chunk"] is False


def test_successful_empty_calendar_can_be_explained_by_model(client, monkeypatch):
    class Calendar:
        async def available_slots(self, start, end):
            return {"status": "available", "slots": [], "timezone": "America/Los_Angeles"}
    monkeypatch.setattr(calendar_runtime, "calendar_service", lambda: Calendar())
    provider = script(monkeypatch,
                      round_of(call("get_meeting_availability", start=START, end="2026-10-15T16:00:00+00:00")),
                      round_of(TextDelta("There are no returned slots in this date range.")))
    with client.websocket_connect("/ws/calendar-empty") as ws:
        frames = say(ws)
    assert len(provider.requests) == 2
    assert "no returned slots" in "".join(frame.get("message", "") for frame in frames)
    assert of_type(frames, "portfolio_card")[0]["data"]["status"] == "available"
