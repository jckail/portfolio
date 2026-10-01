import asyncio
import logging
import time
from datetime import UTC, datetime
from typing import Any

from supabase import Client, create_client

from backend.app.config import get_settings

logger = logging.getLogger(__name__)

# A Supabase outage fails every log batch (every 5 seconds) and chat write.
# One line per window, with a count, instead of one per failure; the exception
# text is left out because provider errors can carry project URLs.
_WARN_INTERVAL_SECONDS = 60.0
_last_warned: dict[str, float] = {}
_suppressed: dict[str, int] = {}


def _warn_sink_failure(what: str) -> None:
    now = time.monotonic()
    last = _last_warned.get(what)
    if last is not None and now - last < _WARN_INTERVAL_SECONDS:
        _suppressed[what] = _suppressed.get(what, 0) + 1
        return
    _last_warned[what] = now
    skipped = _suppressed.pop(what, 0)
    logger.warning("Failed to store %s in Supabase (%d similar failures suppressed)", what, skipped)


def get_supabase_config():
    """Get Supabase configuration from application settings."""
    settings = get_settings()

    if not settings.supabase_url or not settings.supabase_anon_key or not settings.supabase_service_role:
        raise ValueError("Supabase URL, anon key, and service role key must be set in environment variables")

    return settings.supabase_url, settings.supabase_anon_key, settings.supabase_service_role

class SupabaseClient:
    _regular_client = None
    _admin_client = None
    _url = None
    _anon_key = None
    _service_role_key = None

    @classmethod
    def initialize_config(cls):
        """Initialize configuration if not already done."""
        if cls._url is None:
            cls._url, cls._anon_key, cls._service_role_key = get_supabase_config()

    @classmethod
    def get_client(cls) -> Client:
        """Get the regular Supabase client instance (lazy loaded)."""
        if cls._regular_client is None:
            cls.initialize_config()
            cls._regular_client = create_client(cls._url, cls._anon_key)
        return cls._regular_client

    @classmethod
    def get_admin_client(cls) -> Client:
        """Get the admin Supabase client instance (lazy loaded)."""
        if cls._admin_client is None:
            cls.initialize_config()
            cls._admin_client = create_client(cls._url, cls._service_role_key)
        return cls._admin_client

    @classmethod
    async def sign_in_with_password(cls, email: str, password: str):
        """Sign in a user with email and password."""
        try:
            client = cls.get_client()
            auth_response = await asyncio.to_thread(
                client.auth.sign_in_with_password,
                {
                    "email": email,
                    "password": password
                }
            )
            return auth_response
        except Exception as e:
            raise Exception(f"Authentication failed: {str(e)}")

    @classmethod
    async def sign_out(cls, token: str = None):
        """Sign out the current user or invalidate a specific session token."""
        try:
            if token:
                admin_client = cls.get_admin_client()
                await asyncio.to_thread(admin_client.auth.admin.sign_out, token)
            else:
                client = cls.get_client()
                await asyncio.to_thread(client.auth.sign_out)
        except Exception as e:
            raise Exception(f"Sign out failed: {str(e)}")

    @classmethod
    async def store_log(cls, level: str, message: str, session_uuid: str = None, metadata: dict[str, Any] = None, source: str = "backend", ip_address: str = None):
        """Store a log entry in Supabase. Returns None on failure."""
        try:
            admin_client = cls.get_admin_client()
            log_entry = {
                'timestamp': datetime.now(UTC).isoformat(),
                'level': level.upper(),
                'message': message,
                'session_uuid': session_uuid,
                'metadata': metadata or {},
                'source': source,
                'ip_address': ip_address
            }

            result = await asyncio.to_thread(
                lambda: admin_client.table('logs').insert(log_entry).execute()
            )
            return result
        except Exception:
            _warn_sink_failure("log entry")
            return None

    @classmethod
    async def store_logs_batch(cls, logs: list[dict[str, Any]]):
        """Store multiple log entries in Supabase at once. Returns None on failure."""
        try:
            admin_client = cls.get_admin_client()
            log_entries = []

            for log in logs:
                log_entry = {
                    'timestamp': datetime.now(UTC).isoformat(),
                    'level': log['level'].upper(),
                    'message': log['message'],
                    'session_uuid': log.get('session_uuid'),
                    'metadata': log['metadata'],
                    'source': log['source'],
                    'ip_address': log['ip_address']
                }
                log_entries.append(log_entry)

            if log_entries:
                result = await asyncio.to_thread(
                    lambda: admin_client.table('logs').insert(log_entries).execute()
                )
                return result
            return None
        except Exception:
            _warn_sink_failure("log batch")
            return None

    @classmethod
    async def store_chat_message(cls, google_analytics_session_id: str, message_type: str, message_detail: str):
        """Store a chat message in Supabase. Returns None on failure."""
        try:
            admin_client = cls.get_admin_client()
            message_entry = {
                'timestamp': datetime.now(UTC).isoformat(),
                'google_analytics_session_id': google_analytics_session_id,
                'type': message_type,  # 'sent' or 'received'
                'message_detail': message_detail
            }

            result = await asyncio.to_thread(
                lambda: admin_client.table('portfolio_assistant_messages').insert(message_entry).execute()
            )
            return result
        except Exception:
            _warn_sink_failure("chat message")
            return None

# Create a module-level interface
supabase = SupabaseClient()
