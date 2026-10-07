"""Application-owned Calendar service; credentials remain server-side."""
from functools import lru_cache

from backend.app.config import get_settings
from backend.app.services.calendar_service import CalendarConfig, GoogleCalendarService


@lru_cache(maxsize=1)
def calendar_service() -> GoogleCalendarService:
    settings = get_settings()
    return GoogleCalendarService(CalendarConfig(
        client_id=settings.google_calendar_client_id,
        client_secret=settings.google_calendar_client_secret,
        refresh_token=settings.google_calendar_refresh_token,
        calendar_id=settings.google_calendar_id,
        enabled=settings.calendar_booking_enabled,
        policy_confirmed=settings.calendar_policy_confirmed,
        timezone=settings.calendar_timezone,
        start_hour=settings.calendar_start_hour,
        end_hour=settings.calendar_end_hour,
    ))


async def close_calendar_service():
    if calendar_service.cache_info().currsize:
        await calendar_service().aclose()
        calendar_service.cache_clear()
