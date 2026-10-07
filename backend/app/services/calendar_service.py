"""Private Google Calendar runtime adapter; booking is confirmation-only.

Reads free/busy without exposing event details. Credentials are runtime OAuth
secrets supplied by the application, never an interactive Codex connector.
"""
from __future__ import annotations

import asyncio
import hashlib
import re
import time
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from urllib.parse import quote, urlparse
from zoneinfo import ZoneInfo

import httpx
from pydantic import EmailStr, TypeAdapter, ValidationError

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3"
_CONFIRMATION_ID = re.compile(r"^[A-Za-z0-9_-]{8,128}$")
_EMAIL = TypeAdapter(EmailStr)


class CalendarUnavailable(Exception):
    """Safe failure; no provider response or credentials in exception text."""


class CalendarNotConfigured(CalendarUnavailable):
    """Runtime calendar authorization has not been provisioned."""


class CalendarSlotUnavailable(Exception):
    """Selected time is busy, outside policy, or no longer bookable."""


@dataclass(frozen=True)
class CalendarConfig:
    client_id: str = field(default="", repr=False)
    client_secret: str = field(default="", repr=False)
    refresh_token: str = field(default="", repr=False)
    calendar_id: str = field(default="", repr=False)
    enabled: bool = False
    policy_confirmed: bool = False
    timezone: str = "America/Los_Angeles"
    start_hour: int = 9
    end_hour: int = 17
    notice_hours: int = 24
    horizon_days: int = 21
    slot_minutes: int = 30

    @property
    def configured(self):
        return self.enabled and self.policy_confirmed and all((self.client_id, self.client_secret, self.refresh_token, self.calendar_id))


class GoogleCalendarService:
    def __init__(self, config: CalendarConfig, *, transport=None, now=None):
        self.config = config
        self._http = httpx.AsyncClient(timeout=10, transport=transport, follow_redirects=False)
        self._token = ""
        self._token_until = 0.0
        self._token_lock = asyncio.Lock()
        self._now = now or (lambda: datetime.now(UTC))
        self._timezone = ZoneInfo(config.timezone)
        if not (0 <= config.start_hour < config.end_hour <= 24
                and config.slot_minutes == 30 and 0 <= config.notice_hours <= 168
                and 1 <= config.horizon_days <= 30):
            raise ValueError("Invalid calendar booking policy")

    async def aclose(self):
        await self._http.aclose()

    async def _access_token(self):
        if not self.config.configured:
            raise CalendarNotConfigured
        async with self._token_lock:
            if self._token and time.monotonic() < self._token_until:
                return self._token
            try:
                response = await self._http.post(GOOGLE_TOKEN_URL, data={
                    "client_id": self.config.client_id,
                    "client_secret": self.config.client_secret,
                    "refresh_token": self.config.refresh_token,
                    "grant_type": "refresh_token",
                })
                if response.status_code != 200:
                    raise CalendarUnavailable
                data = response.json()
                token = data.get("access_token")
                expires = data.get("expires_in")
                if (not isinstance(token, str) or not token
                        or not isinstance(expires, int) or expires <= 0):
                    raise CalendarUnavailable
                self._token = token
                self._token_until = time.monotonic() + max(0, min(expires, 3600) - 60)
                return token
            except (httpx.HTTPError, ValueError, TypeError, AttributeError):
                raise CalendarUnavailable from None

    async def _request(self, method, path, **kwargs):
        token = await self._access_token()
        try:
            response = await self._http.request(method, GOOGLE_CALENDAR_API + path,
                                                headers={"Authorization": f"Bearer {token}"}, **kwargs)
        except httpx.HTTPError:
            raise CalendarUnavailable from None
        if response.status_code == 401:
            self._token = ""
            self._token_until = 0
        return response

    @staticmethod
    def _parse(value):
        if not isinstance(value, str) or len(value) > 40:
            raise CalendarSlotUnavailable
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            raise CalendarSlotUnavailable from None
        if parsed.tzinfo is None:
            raise CalendarSlotUnavailable
        return parsed.astimezone(UTC)

    def _valid_slot(self, start):
        local = start.astimezone(self._timezone)
        end = local + timedelta(minutes=30)
        return (self._now() + timedelta(hours=self.config.notice_hours) <= start
                <= self._now() + timedelta(days=self.config.horizon_days)
                and local.weekday() < 5 and local.minute in (0, 30)
                and local.second == 0 and local.microsecond == 0
                and self.config.start_hour <= local.hour
                and end.hour + end.minute / 60 <= self.config.end_hour)

    async def _busy(self, start, end):
        response = await self._request("POST", "/freeBusy", json={
            "timeMin": start.isoformat(), "timeMax": end.isoformat(),
            "timeZone": self.config.timezone, "items": [{"id": self.config.calendar_id}],
        })
        if response.status_code != 200:
            raise CalendarUnavailable
        try:
            item = response.json()["calendars"][self.config.calendar_id]
            if item.get("errors") or not isinstance(item.get("busy"), list):
                raise CalendarUnavailable
            busy = [(self._parse(v["start"]), self._parse(v["end"])) for v in item["busy"]]
            if any(a >= b for a, b in busy):
                raise CalendarUnavailable
            return busy
        except (KeyError, TypeError, ValueError, AttributeError, CalendarSlotUnavailable):
            raise CalendarUnavailable from None

    async def available_slots(self, start: str, end: str):
        if not self.config.configured:
            raise CalendarNotConfigured
        first, last = self._parse(start), self._parse(end)
        if not first < last or last - first > timedelta(days=7):
            raise CalendarSlotUnavailable
        earliest = self._now() + timedelta(hours=self.config.notice_hours)
        latest = self._now() + timedelta(days=self.config.horizon_days)
        first, last = max(first, earliest), min(last, latest)
        if first >= last:
            return {"status": "available", "timezone": self.config.timezone, "slots": []}
        busy = await self._busy(first, last)
        local = first.astimezone(self._timezone)
        candidate = local.replace(second=0, microsecond=0, minute=(local.minute // 30) * 30)
        if candidate < local:
            candidate += timedelta(minutes=30)
        slots = []
        while candidate.astimezone(UTC) + timedelta(minutes=30) <= last and len(slots) < 10:
            a = candidate.astimezone(UTC)
            b = a + timedelta(minutes=30)
            if self._valid_slot(a) and not any(a < y and b > x for x, y in busy):
                slots.append({"start": a.isoformat(), "end": b.isoformat()})
            candidate += timedelta(minutes=30)
        return {"status": "available", "timezone": self.config.timezone, "slots": slots}

    def _event_path(self, event_id=""):
        suffix = "/" + event_id if event_id else ""
        return "/calendars/" + quote(self.config.calendar_id, safe="") + "/events" + suffix

    def _verified_booking(self, event, event_id, confirmation_id, start, end, email):
        try:
            if (event["id"] != event_id or event["status"] != "confirmed"
                    or event["extendedProperties"]["private"]["portfolio_confirmation"] != confirmation_id
                    or event["extendedProperties"]["private"]["portfolio_visitor"] != hashlib.sha256(email.casefold().encode()).hexdigest()
                    or self._parse(event["start"]["dateTime"]) != start
                    or self._parse(event["end"]["dateTime"]) != end):
                raise CalendarUnavailable
        except (KeyError, TypeError, CalendarSlotUnavailable):
            raise CalendarUnavailable from None
        result = {"status": "booked", "start": start.isoformat(), "end": end.isoformat(),
                  "timezone": self.config.timezone}
        link = event.get("htmlLink")
        if isinstance(link, str) and urlparse(link).scheme == "https" and urlparse(link).hostname == "calendar.google.com":
            result["calendar_url"] = link
        return result

    async def book_confirmed(self, *, start: str, topic: str, visitor_email: str,
                             visitor_company: str, confirmation_id: str):
        """Only call from a consumed visitor confirmation, never an LLM tool.

        Google has no atomic freebusy+insert operation. A slot-derived event ID
        serializes this app's exact-grid bookings; external calendar edits may
        still race the final freebusy check. A confirmed event is not a claim
        that Jordan has personally accepted the invitation.
        """
        if not self.config.configured:
            raise CalendarNotConfigured
        first = self._parse(start)
        last = first + timedelta(minutes=30)
        if (not self._valid_slot(first) or not isinstance(topic, str) or not 1 <= len(topic.strip()) <= 200
                or not isinstance(visitor_company, str) or not 1 <= len(visitor_company.strip()) <= 120
                or not isinstance(confirmation_id, str) or not _CONFIRMATION_ID.fullmatch(confirmation_id)):
            raise CalendarSlotUnavailable
        try:
            email = str(_EMAIL.validate_python(visitor_email))
        except ValidationError:
            raise CalendarSlotUnavailable from None
        event_id = "portfolio" + hashlib.sha256((self.config.calendar_id + first.isoformat()).encode()).hexdigest()
        busy = await self._busy(first, last)
        if any(first < y and last > x for x, y in busy):
            # A lost insert response can be retried only by the exact same
            # confirmation. Other visitors learn only that the slot is busy.
            existing = await self._request("GET", self._event_path(event_id))
            if existing.status_code == 200:
                try:
                    return self._verified_booking(existing.json(), event_id, confirmation_id, first, last, email)
                except (CalendarUnavailable, ValueError):
                    pass
            raise CalendarSlotUnavailable
        body = {
            "id": event_id, "summary": f"Portfolio introduction: {topic.strip()}",
            "description": f"Company: {visitor_company.strip()}\nContact: {email}\nRequested through Jordan's portfolio.",
            "start": {"dateTime": first.isoformat(), "timeZone": self.config.timezone},
            "end": {"dateTime": last.isoformat(), "timeZone": self.config.timezone},
            "attendees": [{"email": email}], "visibility": "private",
            "extendedProperties": {"private": {"portfolio_confirmation": confirmation_id,
                                               "portfolio_visitor": hashlib.sha256(email.casefold().encode()).hexdigest()}},
        }
        response = await self._request("POST", self._event_path(), params={"sendUpdates": "all"}, json=body)
        if response.status_code == 409:
            response = await self._request("GET", self._event_path(event_id))
            if response.status_code != 200:
                raise CalendarSlotUnavailable
        elif response.status_code not in (200, 201):
            raise CalendarUnavailable
        try:
            return self._verified_booking(response.json(), event_id, confirmation_id, first, last, email)
        except ValueError:
            raise CalendarUnavailable from None
