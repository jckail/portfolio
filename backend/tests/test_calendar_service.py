"""Google Calendar adapter uses synthetic HTTP; no real events or OAuth tokens."""
import asyncio
import dataclasses
import json
from datetime import UTC, datetime

import httpx
import pytest

from backend.app.services.calendar_service import (
    CalendarConfig,
    CalendarNotConfigured,
    CalendarSlotUnavailable,
    CalendarUnavailable,
    GoogleCalendarService,
)

NOW = datetime(2026, 10, 7, 15, tzinfo=UTC)
START = "2026-10-08T16:00:00+00:00"
END = "2026-10-08T16:30:00+00:00"
CONFIG = CalendarConfig(client_id="CLIENT-SECRET", client_secret="OAUTH-SECRET",
                        refresh_token="REFRESH-SECRET", calendar_id="owner@example.com",
                        enabled=True, policy_confirmed=True)


class CalendarHTTP:
    def __init__(self):
        self.calls = []
        self.events = {}
        self.busy = []
        self.token_status = 200
        self.freebusy_status = 200
        self.calendar_errors = False
        self.insert_status = 200
        self.insert_event_status = "confirmed"

    def __call__(self, request):
        self.calls.append(request)
        if request.url.host == "oauth2.googleapis.com":
            return httpx.Response(self.token_status, json={"access_token": "ACCESS-SECRET", "expires_in": 3600})
        assert request.headers["authorization"] == "Bearer ACCESS-SECRET"
        if request.url.path.endswith("/freeBusy"):
            return httpx.Response(self.freebusy_status, json={"calendars": {
                CONFIG.calendar_id: {"busy": self.busy, "errors": [{"reason": "private-error"}] if self.calendar_errors else []},
            }})
        if request.method == "GET":
            event = self.events.get(request.url.path.rsplit("/", 1)[-1])
            return httpx.Response(200 if event else 404, json=event or {})
        assert request.method == "POST" and request.url.path.endswith("/events")
        assert request.url.params["sendUpdates"] == "all"
        event = json.loads(request.content)
        if event["id"] in self.events:
            return httpx.Response(409, json={})
        event.update(status=self.insert_event_status, htmlLink="https://calendar.google.com/calendar/event?eid=test")
        self.events[event["id"]] = event
        return httpx.Response(self.insert_status, json=event)


def service(fake, config=CONFIG, now=NOW):
    return GoogleCalendarService(config, transport=httpx.MockTransport(fake), now=lambda: now)


def book(adapter, **overrides):
    kwargs = dict(start=START, topic="AI infrastructure role", visitor_email="recruiter@example.com",
                  visitor_company="Example AI", confirmation_id="confirmation123")
    return adapter.book_confirmed(**(kwargs | overrides))


def test_unconfigured_and_unapproved_policy_make_no_network_request():
    for config in (CalendarConfig(), dataclasses.replace(CONFIG, policy_confirmed=False),
                   dataclasses.replace(CONFIG, enabled=False)):
        fake = CalendarHTTP()
        with pytest.raises(CalendarNotConfigured):
            asyncio.run(service(fake, config).available_slots(START, END))
        assert fake.calls == []
    assert "SECRET" not in repr(CONFIG) and "owner@example.com" not in repr(CONFIG)


def test_freebusy_filters_busy_and_returns_slots_only():
    fake = CalendarHTTP()
    fake.busy = [{"start": START, "end": END}]
    result = asyncio.run(service(fake).available_slots(START, "2026-10-08T18:00:00Z"))
    assert len(result["slots"]) == 3
    assert result["slots"][0]["start"] == "2026-10-08T16:30:00+00:00"
    assert "owner@example.com" not in str(result) and "busy" not in result
    assert len(fake.calls) == 2
    assert fake.calls[1].url.path.endswith("freeBusy")


def test_calendar_errors_are_unavailable_not_empty_free_slots():
    fake = CalendarHTTP()
    fake.calendar_errors = True
    with pytest.raises(CalendarUnavailable) as failure:
        asyncio.run(service(fake).available_slots(START, END))
    assert str(failure.value) == ""


@pytest.mark.parametrize("status", [401, 403, 429, 500])
def test_token_and_calendar_failures_are_sanitized(status):
    fake = CalendarHTTP()
    fake.token_status = status
    with pytest.raises(CalendarUnavailable) as failure:
        asyncio.run(service(fake).available_slots(START, END))
    assert "SECRET" not in str(failure.value)
    assert len(fake.calls) == 1
    fake = CalendarHTTP()
    fake.freebusy_status = status
    with pytest.raises(CalendarUnavailable):
        asyncio.run(service(fake).available_slots(START, END))


@pytest.mark.parametrize("start", [
    "2026-10-08T16:15:00Z", "2026-10-08T15:00:00Z", "2026-10-10T16:00:00Z",
    "2026-10-07T16:00:00Z", "2026-11-08T17:00:00Z", "2026-10-08T16:00:00", "garbage",
])
def test_forged_or_outside_policy_slots_cannot_book(start):
    fake = CalendarHTTP()
    with pytest.raises(CalendarSlotUnavailable):
        asyncio.run(book(service(fake), start=start))
    assert fake.calls == []


def test_booking_rechecks_busy_and_sends_real_invitation_only_after_confirmation():
    fake = CalendarHTTP()
    result = asyncio.run(book(service(fake)))
    assert result["status"] == "booked"
    assert result["start"] == START
    event = next(iter(fake.events.values()))
    assert event["attendees"] == [{"email": "recruiter@example.com"}]
    assert event["visibility"] == "private"
    assert event["extendedProperties"]["private"]["portfolio_confirmation"] == "confirmation123"
    assert fake.calls[-2].url.path.endswith("freeBusy")
    assert fake.calls[-1].url.path.endswith("events")


def test_busy_slot_never_inserts_an_event():
    fake = CalendarHTTP()
    fake.busy = [{"start": START, "end": END}]
    with pytest.raises(CalendarSlotUnavailable):
        asyncio.run(book(service(fake)))
    assert not fake.events
    assert not any(r.method == "POST" and r.url.path.endswith("events") for r in fake.calls)


def test_duplicate_confirmation_is_idempotent_but_other_visitor_cannot_claim_it():
    fake = CalendarHTTP()

    async def scenario():
        adapter = service(fake)
        first = await book(adapter)
        fake.busy = [{"start": START, "end": END}]
        assert await book(adapter) == first
        with pytest.raises(CalendarSlotUnavailable):
            await book(adapter, confirmation_id="differentconfirmation")
        with pytest.raises(CalendarSlotUnavailable):
            await book(adapter, visitor_email="different@example.com")
        await adapter.aclose()

    asyncio.run(scenario())
    assert len(fake.events) == 1
    assert len([r for r in fake.calls if r.url.path.endswith("events")]) == 1


def test_unverified_insert_response_cannot_claim_a_booking():
    fake = CalendarHTTP()
    fake.insert_event_status = "tentative"
    with pytest.raises(CalendarUnavailable):
        asyncio.run(book(service(fake)))


def test_dst_uses_configured_owner_timezone():
    fake = CalendarHTTP()
    now = datetime(2026, 10, 30, 15, tzinfo=UTC)
    result = asyncio.run(service(fake, now=now).available_slots(
        "2026-11-02T16:00:00Z", "2026-11-02T19:00:00Z"))
    assert result["slots"][0]["start"] == "2026-11-02T17:00:00+00:00"  # 9am PST after DST
    assert result["timezone"] == "America/Los_Angeles"


def test_invalid_book_identity_and_untrusted_provider_url():
    fake = CalendarHTTP()
    for kwargs in ({"visitor_email": "not-an-email"}, {"confirmation_id": "bad"}, {"visitor_company": ""}):
        with pytest.raises(CalendarSlotUnavailable):
            asyncio.run(book(service(fake), **kwargs))
    assert fake.calls == []
