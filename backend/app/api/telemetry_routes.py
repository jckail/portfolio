import asyncio
import ipaddress
import json
import logging
import os
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from ..config import get_settings
from ..middleware.auth_middleware import verify_admin_token
from ..utils.rate_limit import SlidingWindowLimiter, client_ip, enforce_rate_limit
from ..utils.supabase_client import SupabaseClient

router = APIRouter()
logger = logging.getLogger(__name__)

# These ingest endpoints are unauthenticated and write to shared storage, so
# both the size of a single request and the rate of requests are bounded.
MAX_INGEST_BYTES = 64 * 1024
MAX_BATCH_LOGS = 50
MAX_LOG_MESSAGE_CHARS = 2000

# The limiter counts stored entries, not requests: a batch is charged one unit
# per log line, so batching cannot multiply the allowance by MAX_BATCH_LOGS.
_ingest_limiter = SlidingWindowLimiter(max_events=120, window_seconds=60, global_max_events=1200, name="telemetry_ingest")

# The file fallback only exists for local debugging. Cloud Run's writable
# filesystem is backed by instance memory, so on the platform it is disabled
# outright; locally it is capped so a Supabase outage plus an anonymous
# caller cannot grow the log tree without bound.
MAX_FALLBACK_FILE_BYTES = 1024 * 1024
MAX_FALLBACK_TOTAL_BYTES = 5 * 1024 * 1024
_fallback_bytes_written = 0


class TelemetryPayload(BaseModel):
    """Shape of a POST /api/telemetry body. Unknown keys are ignored."""

    model_config = ConfigDict(extra="ignore")

    sessionUUID: uuid.UUID
    timestamp: datetime
    browserInfo: dict[str, Any] = Field(default_factory=dict)
    connectionInfo: dict[str, Any] = Field(default_factory=dict)
    deviceInfo: dict[str, Any] = Field(default_factory=dict)
    featureSupport: dict[str, Any] = Field(default_factory=dict)

    @field_validator("timestamp", mode="before")
    @classmethod
    def _iso_string_only(cls, value: Any) -> Any:
        # Pydantic would read a bare number as a Unix epoch; the client always
        # sends ISO 8601, so anything else is a malformed request.
        if not isinstance(value, str):
            raise ValueError("timestamp must be an ISO 8601 string")
        return value


class LogEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")

    sessionUUID: uuid.UUID
    message: str = ""


class LogBatch(BaseModel):
    model_config = ConfigDict(extra="ignore")

    logs: list[LogEntry] = Field(..., min_length=1)


class IngestResult(BaseModel):
    status: str = "success"
    message: str


class LogRows(BaseModel):
    logs: list[dict[str, Any]]


async def _read_json_capped(request: Request, max_bytes: int = MAX_INGEST_BYTES) -> Any:
    """Read a JSON body, refusing anything over `max_bytes`.

    `await request.json()` buffers the whole body first, so a large upload is
    already in memory by the time it could be rejected. Streaming lets us stop
    reading as soon as the cap is passed.
    """
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > max_bytes:
            raise HTTPException(status_code=413, detail="Payload too large")
    try:
        return json.loads(body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(status_code=400, detail="Malformed JSON body")


def _enforce_ingest_limit(request: Request, cost: int = 1) -> None:
    enforce_rate_limit(_ingest_limiter, request, cost=cost)


def _validate[M: BaseModel](model: type[M], data: Any) -> M:
    """Validate a parsed body, turning type errors into a 422.

    Without this a wrong-typed field (a numeric sessionUUID, say) reached
    uuid/datetime calls and surfaced as a 500. The error list omits the input
    values so a 64 KB body is not echoed back.
    """
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="Body must be a JSON object")
    try:
        return model.model_validate(data)
    except ValidationError as e:
        raise HTTPException(
            status_code=422,
            detail=e.errors(include_url=False, include_context=False, include_input=False),
        )

_LOCAL_HOSTNAMES = frozenset({"localhost", "127.0.0.1", "::1"})


def _host_is_local(host_header: str) -> bool:
    """True when a Host header names this machine (port ignored)."""
    host = host_header.strip().lower()
    if host.startswith("["):  # bracketed IPv6, e.g. [::1]:8080
        host = host[1:host.find("]")] if "]" in host else host
    else:
        host = host.rsplit(":", 1)[0] if host.count(":") == 1 else host
    return host in _LOCAL_HOSTNAMES


def is_local_dev_environment(request: Request) -> bool:
    """Allow the admin-auth bypass only when the server itself is explicitly
    running in dev mode AND the request comes from a loopback address AND
    names a local Host.

    A loopback peer alone is not enough: a DNS-rebinding page reaches
    127.0.0.1 with its own hostname in Host, and a local proxy forwards LAN
    callers from loopback (the forwarding headers give that away). Never on
    Cloud Run, whatever DEV_MODE says.

    The Origin header is client-controlled and must never be used as a
    security signal on its own.
    """
    settings = get_settings()
    if not settings.dev_mode or settings.on_cloud_run:
        return False

    client_host = request.client.host if request.client else None
    if not client_host:
        return False
    try:
        if not ipaddress.ip_address(client_host).is_loopback:
            return False
    except ValueError:
        return False

    if not _host_is_local(request.headers.get("host", "")):
        return False
    return not any(
        request.headers.get(h) for h in ("x-forwarded-for", "x-forwarded-host", "forwarded")
    )

async def verify_access(request: Request):
    """Verify access based on local dev environment or admin authentication"""
    if not is_local_dev_environment(request):
        # Get the token from the Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            raise HTTPException(status_code=401, detail="No authorization token provided")

        # Verify the admin token
        await verify_admin_token(auth_header)

def _read_lines(path: str) -> list[str]:
    """Read all lines from a file (blocking; run via asyncio.to_thread)."""
    with open(path, encoding='utf-8') as f:
        return f.readlines()


def _append_line(path: str, line: str) -> None:
    """Append a line to a file (blocking; run via asyncio.to_thread)."""
    with open(path, "a", encoding='utf-8') as f:
        f.write(line)


def get_log_file_path(session_uuid=None):
    """Get the current log file path based on timestamp and session UUID"""
    now = datetime.now(UTC)
    base_log_dir = os.path.join(os.path.dirname(__file__), "../logs")
    frontend_log_dir = os.path.join(base_log_dir, "frontend", now.strftime('%Y_%m_%d'))

    # Ensure frontend logs directory exists
    os.makedirs(frontend_log_dir, exist_ok=True)

    # The session id reaches this function straight from an unauthenticated
    # request body, and os.path.join happily accepts "../.." or an absolute
    # path — either of which would place an attacker-controlled write outside
    # the log tree. Only a canonical UUID is allowed to name a file.
    try:
        filename = f"{uuid.UUID(str(session_uuid))}.log"
    except (ValueError, AttributeError, TypeError):
        filename = "unknown_session.log"

    return os.path.join(frontend_log_dir, filename)

@router.post("/telemetry", response_model=IngestResult)
async def store_telemetry(request: Request) -> IngestResult:
    """Store telemetry data from the frontend"""
    _enforce_ingest_limit(request)
    try:
        payload = _validate(TelemetryPayload, await _read_json_capped(request))

        # Get Supabase client
        supabase = SupabaseClient()

        # Store telemetry data in Supabase (off the event loop; the SDK is sync)
        try:
            entry = {
                'timestamp': payload.timestamp.isoformat(),
                'session_uuid': str(payload.sessionUUID),
                'browser_info': payload.browserInfo,
                'connection_info': payload.connectionInfo,
                'device_info': payload.deviceInfo,
                'feature_support': payload.featureSupport,
                'ip_address': client_ip(request)
            }
            await asyncio.to_thread(
                lambda: supabase.get_admin_client().table('telemetry').insert(entry).execute()
            )

            return IngestResult(message="Telemetry data stored successfully")

        except Exception:
            logger.exception("Failed to store telemetry data in Supabase")
            raise HTTPException(
                status_code=500,
                detail="Failed to store telemetry data"
            )

    except HTTPException:
        raise
    except Exception:
        # Provider/driver exception text can name tables and columns.
        logger.exception("Error processing telemetry data")
        raise HTTPException(
            status_code=500,
            detail="Unable to store telemetry data"
        )

@router.get("/logs", response_model=LogRows)
async def get_logs(request: Request, session_uuid: str | None = None) -> LogRows:
    """Fetch logs from Supabase, falling back to file system if needed"""
    # Verify access (local dev environment or admin auth)
    await verify_access(request)

    try:
        # Get Supabase client only when needed
        supabase = SupabaseClient()

        # Try to fetch logs from Supabase first
        query = supabase.get_admin_client().table('logs').select('*')

        # Handle multiple session UUIDs
        session_uuids = []
        if session_uuid:
            session_uuids = [sid.strip() for sid in session_uuid.split(',') if sid.strip()]
            if session_uuids:
                query = query.in_('session_uuid', session_uuids)

        query = query.order('timestamp', desc=False)

        result = await asyncio.to_thread(query.execute)
        if result.data:
            return LogRows(logs=result.data)

        # Fall back to file system if no logs in Supabase
        logs = []
        if session_uuids:
            for sid in session_uuids:
                log_file_path = get_log_file_path(sid)
                if os.path.exists(log_file_path):
                    file_logs = await asyncio.to_thread(_read_lines, log_file_path)
                    for log in file_logs:
                        log = log.strip()
                        if not log:
                            continue
                        try:
                            timestamp = log[1:log.index(']')]
                            message = log[log.index(']')+1:].strip()
                            logs.append({
                                "timestamp": timestamp,
                                "message": message
                            })
                        except ValueError:
                            # Line without a [timestamp] prefix
                            logs.append({
                                "timestamp": "",
                                "message": log
                            })

        return LogRows(logs=logs)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error fetching logs")
        raise HTTPException(status_code=500, detail="Unable to fetch logs")

def _normalize_message(message: str) -> str:
    """Bound and single-line a client log message, adding a timestamp."""
    # Newlines would let a caller forge extra entries in the file fallback,
    # which /api/logs parses back one line per record.
    message = message.replace("\r", " ").replace("\n", " ")[:MAX_LOG_MESSAGE_CHARS]
    if not message.startswith('[20'):  # Check if timestamp is already present
        timestamp = datetime.now(UTC).isoformat().replace('+00:00', 'Z')
        message = f'[{timestamp}] {message}'
    return message


def _file_fallback_allowed() -> bool:
    return not get_settings().on_cloud_run


async def _write_file_fallback(lines_by_session: dict[str, list[str]]) -> None:
    """Append undeliverable frontend logs to local files, within the byte caps."""
    global _fallback_bytes_written
    if not _file_fallback_allowed():
        logger.warning("Dropping frontend logs: Supabase unavailable and file fallback is disabled")
        return
    for session_uuid, lines in lines_by_session.items():
        data = "".join(f"{line}\n" for line in lines)
        size = len(data.encode("utf-8"))
        log_file_path = get_log_file_path(session_uuid)
        try:
            existing = os.path.getsize(log_file_path)
        except OSError:
            existing = 0
        if (_fallback_bytes_written + size > MAX_FALLBACK_TOTAL_BYTES
                or existing + size > MAX_FALLBACK_FILE_BYTES):
            logger.warning("Dropping frontend logs: file fallback size cap reached")
            continue
        _fallback_bytes_written += size
        # Append without blocking the event loop
        await asyncio.to_thread(_append_line, log_file_path, data)


async def _store_frontend_logs(entries: list[tuple[str, str]], peer: str) -> None:
    """Store (session_uuid, message) pairs with one Supabase insert.

    store_logs_batch() swallows its own errors and returns None on failure,
    so check the result rather than relying on an exception.
    """
    messages = [(sid, _normalize_message(msg)) for sid, msg in entries]
    result = await SupabaseClient().store_logs_batch([
        {
            'level': "INFO",
            'message': message,
            'session_uuid': sid,
            'metadata': {},
            'source': "frontend",
            'ip_address': peer,
        }
        for sid, message in messages
    ])
    if result is None:
        logger.error("Failed to store frontend logs in Supabase; using file fallback")
        by_session: dict[str, list[str]] = {}
        for sid, message in messages:
            by_session.setdefault(sid, []).append(message)
        await _write_file_fallback(by_session)


@router.post("/log", response_model=IngestResult)
async def log_message(request: Request) -> IngestResult:
    """Log a single message"""
    _enforce_ingest_limit(request)
    try:
        entry = _validate(LogEntry, await _read_json_capped(request))
        await _store_frontend_logs([(str(entry.sessionUUID), entry.message)], client_ip(request))
        return IngestResult(message="Log written successfully")
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error in log_message endpoint")
        raise HTTPException(status_code=500, detail="Unable to store log")

@router.post("/log/batch", response_model=IngestResult)
async def log_messages_batch(request: Request) -> IngestResult:
    """Log multiple messages in a single request"""
    # Charged before the body is read, deliberately: a refused batch (413, 422
    # or a 429 on the second charge below) still costs one unit, so malformed
    # or oversized requests are rate limited too rather than free to repeat.
    _enforce_ingest_limit(request)
    try:
        body = await _read_json_capped(request)
        # Checked before validation so an oversized batch is refused without
        # validating every entry.
        if isinstance(body, dict) and isinstance(body.get("logs"), list) \
                and len(body["logs"]) > MAX_BATCH_LOGS:
            raise HTTPException(
                status_code=413, detail=f"Batch exceeds {MAX_BATCH_LOGS} entries"
            )
        batch = _validate(LogBatch, body)

        # One unit was charged on entry; charge the rest of the batch now.
        if len(batch.logs) > 1:
            _enforce_ingest_limit(request, cost=len(batch.logs) - 1)

        await _store_frontend_logs(
            [(str(entry.sessionUUID), entry.message) for entry in batch.logs],
            client_ip(request),
        )
        return IngestResult(message="Batch processed successfully")

    except HTTPException:
        raise
    except Exception:
        logger.exception("Error in log_messages_batch endpoint")
        raise HTTPException(status_code=500, detail="Unable to store logs")
