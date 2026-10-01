import asyncio
import logging
import os
import socket
import sys
import threading
from logging.handlers import RotatingFileHandler

from ..utils.supabase_client import supabase
from .json_log import JsonFormatter
from .request_context import get_request_id

# Handlers live on the package root so every `logging.getLogger(__name__)`
# under backend.* emits through them. Anything outside the package (httpx,
# uvicorn, supabase) stays out, which also keeps the Supabase sink from
# logging its own HTTP calls into an endless loop.
LOGGER_NAME = 'backend'
# What setup_logging() hands back to modules that call it for a logger.
APP_LOGGER_NAME = 'backend.app'

# Cloud Run sets K_SERVICE. Its filesystem is in-memory, so local log files
# there only eat the instance's RAM; stdout already goes to Cloud Logging.
ON_CLOUD_RUN = bool(os.getenv('K_SERVICE'))
LOG_DIR = os.path.join(os.path.dirname(__file__), '..', 'logs')
LOG_FILE_MAX_BYTES = 5 * 1024 * 1024
LOG_FILE_BACKUPS = 3

_fallback_lock = threading.Lock()
_EXCEPTION_FORMATTER = logging.Formatter()


def _fallback_logger() -> logging.Logger:
    """Last-resort sink for records the Supabase handler could not deliver.

    Deliberately outside the `backend` tree (and non-propagating) so writing
    here can never re-enter the Supabase handler. Bounded either way: stderr
    on Cloud Run, a rotating file locally.
    """
    fallback = logging.getLogger('portfolio_log_fallback')
    with _fallback_lock:
        if not fallback.handlers:
            fallback.propagate = False
            fallback.setLevel(logging.INFO)
            if ON_CLOUD_RUN:
                handler: logging.Handler = logging.StreamHandler(sys.stderr)
            else:
                os.makedirs(LOG_DIR, exist_ok=True)
                handler = RotatingFileHandler(
                    os.path.join(LOG_DIR, 'fallback.log'),
                    maxBytes=LOG_FILE_MAX_BYTES,
                    backupCount=LOG_FILE_BACKUPS,
                    encoding='utf-8',
                )
            fallback.addHandler(handler)
    return fallback


class SupabaseHandler(logging.Handler):
    """Buffers log records and ships them to Supabase in batches.

    The flush worker is an asyncio task that must be started from a running
    event loop (see `start()`); until then records simply accumulate in the
    queue. `emit()` is safe to call from any thread.
    """

    MAX_QUEUE_SIZE = 1000

    def __init__(self):
        super().__init__()
        self._queue: asyncio.Queue = asyncio.Queue(maxsize=self.MAX_QUEUE_SIZE)
        self._batch_size = 50
        self._flush_interval = 5  # seconds
        self._hostname = socket.gethostname()
        try:
            self._ip_address = socket.gethostbyname(self._hostname)
        except OSError:
            self._ip_address = '127.0.0.1'
        self._loop: asyncio.AbstractEventLoop | None = None
        self._flush_task: asyncio.Task | None = None
        self._lock = threading.Lock()

    def start(self):
        """Start the background flush task. Must be called from a running loop."""
        with self._lock:
            if self._flush_task is not None and not self._flush_task.done():
                return
            self._loop = asyncio.get_running_loop()
            self._flush_task = self._loop.create_task(self._flush_queue())

    async def stop(self):
        """Cancel the flush task and drain any remaining records."""
        with self._lock:
            task = self._flush_task
            self._flush_task = None
        if task is not None:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        await self._flush_batch(self._drain_queue())

    def _drain_queue(self):
        batch = []
        while True:
            try:
                batch.append(self._queue.get_nowait())
            except asyncio.QueueEmpty:
                return batch

    async def _flush_queue(self):
        while True:
            batch = []
            try:
                while len(batch) < self._batch_size:
                    try:
                        record = await asyncio.wait_for(
                            self._queue.get(),
                            timeout=self._flush_interval
                        )
                        batch.append(record)
                    except TimeoutError:
                        break

                await self._flush_batch(batch)
            except asyncio.CancelledError:
                raise
            except Exception as e:
                self._fallback_log(f"Error in _flush_queue: {str(e)}")
            await asyncio.sleep(0.1)

    async def _flush_batch(self, batch):
        if not batch:
            return
        formatted_logs = []
        for record in batch:
            msg = self.format(record)
            metadata = {
                'filename': record.filename,
                'funcName': record.funcName,
                'lineno': record.lineno,
                'hostname': self._hostname
            }
            # Captured in emit(): this runs in the flush task, whose context
            # never carries the originating request's id.
            request_id = getattr(record, 'request_id', None)
            if request_id:
                metadata['request_id'] = request_id
            if record.exc_info:
                # A Handler has no formatException (only Formatters do), so
                # this raised for every record that carried exc_info.
                metadata['exception'] = _EXCEPTION_FORMATTER.formatException(record.exc_info)

            formatted_logs.append({
                'level': record.levelname,
                'message': msg,
                'metadata': metadata,
                'source': "backend",
                'ip_address': self._ip_address
            })

        result = await supabase.store_logs_batch(formatted_logs)
        if result is None:
            self._fallback_log("Failed to store log batch in Supabase")
            for log in formatted_logs:
                self._fallback_log(f"Failed log: {log}")

    def emit(self, record):
        if getattr(record, 'request_id', None) is None:
            record.request_id = get_request_id()
        try:
            if self._loop is not None and self._loop.is_running():
                # Thread-safe handoff to the event loop's queue.
                self._loop.call_soon_threadsafe(self._enqueue, record)
            else:
                self._enqueue(record)
        except Exception as e:
            self._fallback_log(f"Failed to queue log: {str(e)}\nOriginal message: {record.getMessage()}")

    def _enqueue(self, record):
        try:
            self._queue.put_nowait(record)
        except asyncio.QueueFull:
            self._fallback_log(f"Log queue full, dropping record: {record.getMessage()}")

    def _fallback_log(self, message: str):
        """Record a delivery failure without going through Supabase again."""
        try:
            _fallback_logger().warning(message)
        except Exception:
            pass


def get_supabase_handler() -> SupabaseHandler | None:
    """Return the SupabaseHandler attached to the app logger, if any."""
    logger = logging.getLogger(LOGGER_NAME)
    for handler in logger.handlers:
        if isinstance(handler, SupabaseHandler):
            return handler
    return None


def setup_logging(name: str = APP_LOGGER_NAME) -> logging.Logger:
    """Attach JSON stdout + Supabase sinks to the `backend` logger. Idempotent.

    Returns the logger called `name` (default `backend.app`) for callers that
    use it directly; modules may equally use `logging.getLogger(__name__)`.
    """
    root = logging.getLogger(LOGGER_NAME)
    if root.handlers:
        return logging.getLogger(name)

    root.setLevel(logging.INFO)
    # Human-readable message for the Supabase admin dashboard
    plain_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    json_formatter = JsonFormatter()

    try:
        supabase_handler = SupabaseHandler()
        supabase_handler.setLevel(logging.INFO)
        supabase_handler.setFormatter(plain_formatter)
        root.addHandler(supabase_handler)
    except Exception as e:
        print(f"Failed to setup Supabase handler: {str(e)}")

    # Structured JSON to stdout for Cloud Logging
    try:
        stream_handler = logging.StreamHandler(sys.stdout)
        stream_handler.setLevel(logging.INFO)
        stream_handler.setFormatter(json_formatter)
        root.addHandler(stream_handler)
    except Exception as e:
        print(f"Failed to setup stream handler: {str(e)}")

    # Local-only JSON file for grep/jq, rotated so it cannot grow unbounded.
    if not ON_CLOUD_RUN:
        try:
            os.makedirs(LOG_DIR, exist_ok=True)
            file_handler = RotatingFileHandler(
                os.path.join(LOG_DIR, 'app.log'),
                maxBytes=LOG_FILE_MAX_BYTES,
                backupCount=LOG_FILE_BACKUPS,
                encoding='utf-8',
            )
            file_handler.setFormatter(json_formatter)
            root.addHandler(file_handler)
        except Exception as e:
            print(f"Failed to setup file handler: {str(e)}")

    return logging.getLogger(name)
