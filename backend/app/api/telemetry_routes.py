import asyncio
import ipaddress
import json
import os
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from ..config import get_settings
from ..middleware.auth_middleware import verify_admin_token
from ..utils.logger import setup_logging
from ..utils.rate_limit import SlidingWindowLimiter, client_ip
from ..utils.supabase_client import SupabaseClient

router = APIRouter()
logger = setup_logging()

# These ingest endpoints are unauthenticated and write to shared storage, so
# both the size of a single request and the rate of requests are bounded.
MAX_INGEST_BYTES = 64 * 1024
MAX_BATCH_LOGS = 50
MAX_LOG_MESSAGE_CHARS = 2000

_ingest_limiter = SlidingWindowLimiter(max_events=60, window_seconds=60, global_max_events=1200)


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


def _enforce_ingest_limit(request: Request) -> None:
    if not _ingest_limiter.allow(client_ip(request)):
        raise HTTPException(status_code=429, detail="Too many requests")

def is_local_dev_environment(request: Request) -> bool:
    """Allow the admin-auth bypass only when the server itself is explicitly
    running in dev mode AND the request comes from a loopback address.

    The Origin header is client-controlled and must never be used as a
    security signal on its own.
    """
    if not get_settings().dev_mode:
        return False

    client_host = request.client.host if request.client else None
    if not client_host:
        return False
    try:
        ip = ipaddress.ip_address(client_host)
        return ip.is_loopback
    except ValueError:
        return False

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

@router.post("/telemetry")
async def store_telemetry(request: Request):
    """Store telemetry data from the frontend"""
    _enforce_ingest_limit(request)
    try:
        telemetry_data: dict[str, Any] = await _read_json_capped(request)
        if not isinstance(telemetry_data, dict):
            raise HTTPException(status_code=400, detail="Body must be a JSON object")

        # Validate required fields
        if 'sessionUUID' not in telemetry_data:
            raise HTTPException(status_code=400, detail="Missing sessionUUID")
        if 'timestamp' not in telemetry_data:
            raise HTTPException(status_code=400, detail="Missing timestamp")

        # Validate UUID format
        try:
            uuid_obj = uuid.UUID(telemetry_data['sessionUUID'])
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid sessionUUID format")

        # Ensure timestamp is in ISO format
        try:
            timestamp = datetime.fromisoformat(telemetry_data['timestamp'].replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid timestamp format")

        # Get Supabase client
        supabase = SupabaseClient()

        # Store telemetry data in Supabase (off the event loop; the SDK is sync)
        try:
            entry = {
                'timestamp': timestamp.isoformat(),
                'session_uuid': str(uuid_obj),
                'browser_info': telemetry_data.get('browserInfo', {}),
                'connection_info': telemetry_data.get('connectionInfo', {}),
                'device_info': telemetry_data.get('deviceInfo', {}),
                'feature_support': telemetry_data.get('featureSupport', {}),
                'ip_address': client_ip(request)
            }
            await asyncio.to_thread(
                lambda: supabase.get_admin_client().table('telemetry').insert(entry).execute()
            )

            return {"status": "success", "message": "Telemetry data stored successfully"}

        except Exception as e:
            logger.error(f"Failed to store telemetry data in Supabase: {str(e)}")
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

@router.get("/logs")
async def get_logs(request: Request, session_uuid: str = None):
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
            return {"logs": result.data}

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

        return {"logs": logs}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error fetching logs")
        raise HTTPException(status_code=500, detail="Unable to fetch logs")

def _valid_session_uuid(value: Any) -> str | None:
    """Return the canonical UUID string, or None when it isn't one."""
    try:
        return str(uuid.UUID(str(value)))
    except (ValueError, AttributeError, TypeError):
        return None


@router.post("/log")
async def log_message(request: Request):
    """Log a single message"""
    _enforce_ingest_limit(request)
    try:
        body = await _read_json_capped(request)
        if not isinstance(body, dict):
            raise HTTPException(status_code=400, detail="Body must be a JSON object")

        message = body.get("message", "")
        session_uuid = _valid_session_uuid(body.get("sessionUUID"))

        # A validation failure is a client error; returning 200 here made
        # rejected logs indistinguishable from stored ones.
        if session_uuid is None:
            raise HTTPException(status_code=400, detail="Valid sessionUUID is required")

        return await store_log_message(message, session_uuid, client_ip(request))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error in log_message endpoint")
        raise HTTPException(status_code=500, detail="Unable to store log")

@router.post("/log/batch")
async def log_messages_batch(request: Request):
    """Log multiple messages in a single request"""
    _enforce_ingest_limit(request)
    try:
        body = await _read_json_capped(request)
        if not isinstance(body, dict):
            raise HTTPException(status_code=400, detail="Body must be a JSON object")

        logs = body.get("logs", [])
        if not isinstance(logs, list) or not logs:
            raise HTTPException(status_code=400, detail="No logs provided")
        if len(logs) > MAX_BATCH_LOGS:
            raise HTTPException(
                status_code=413, detail=f"Batch exceeds {MAX_BATCH_LOGS} entries"
            )

        peer = client_ip(request)

        # Process all logs in the batch
        results = []
        for log_entry in logs:
            if not isinstance(log_entry, dict):
                continue
            message = log_entry.get("message", "")
            session_uuid = _valid_session_uuid(log_entry.get("sessionUUID"))

            if session_uuid is None:
                logger.warning("Skipping batch log entry with invalid sessionUUID")
                continue

            result = await store_log_message(message, session_uuid, peer)
            results.append(result)

        # Check if any logs were processed successfully
        if any(result.get("status") == "success" for result in results):
            return {"status": "success", "message": "Batch processed successfully"}

        raise HTTPException(status_code=400, detail="Failed to process any logs in batch")

    except HTTPException:
        raise
    except Exception:
        logger.exception("Error in log_messages_batch endpoint")
        raise HTTPException(status_code=500, detail="Unable to store logs")

async def store_log_message(message: str, session_uuid: str, client_ip: str):
    """Store a single log message"""
    try:
        # Add timestamp if not present
        if not message.startswith('[20'):  # Check if timestamp is already present
            timestamp = datetime.now(UTC).isoformat().replace('+00:00', 'Z')
            message = f'[{timestamp}] {message}'

        # Get Supabase client only when needed
        supabase = SupabaseClient()

        # Try to store in Supabase first. store_log() swallows its own errors
        # and returns None on failure, so check the result rather than
        # relying on an exception that will never be raised.
        result = await supabase.store_log(
            level="INFO",
            message=message,
            session_uuid=session_uuid,
            metadata={"raw_message": message},
            source="frontend",
            ip_address=client_ip
        )
        if result is None:
            logger.error("Failed to store frontend log in Supabase; using file fallback")
            log_file_path = get_log_file_path(session_uuid)

            # Ensure message ends with newline
            if not message.endswith('\n'):
                message += '\n'

            # Append message to log file without blocking the event loop
            await asyncio.to_thread(_append_line, log_file_path, message)

        return {"status": "success", "message": "Log written successfully"}
    except Exception as e:
        logger.error(f"Error storing log message: {str(e)}")
        return {"status": "error", "message": str(e)}
