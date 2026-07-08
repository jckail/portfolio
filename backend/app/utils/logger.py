import asyncio
import logging
import os
import socket
import threading

from ..utils.supabase_client import supabase

LOGGER_NAME = 'quickresume'


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
                    except asyncio.TimeoutError:
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
            if record.exc_info:
                metadata['exception'] = self.formatException(record.exc_info)

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
        """Write to fallback log file when Supabase logging fails"""
        try:
            fallback_log_path = os.path.join(os.path.dirname(__file__), '..', 'logs', 'fallback.log')
            os.makedirs(os.path.dirname(fallback_log_path), exist_ok=True)
            with open(fallback_log_path, 'a') as f:
                f.write(f"{message}\n")
        except OSError:
            pass


def get_supabase_handler() -> SupabaseHandler | None:
    """Return the SupabaseHandler attached to the app logger, if any."""
    logger = logging.getLogger(LOGGER_NAME)
    for handler in logger.handlers:
        if isinstance(handler, SupabaseHandler):
            return handler
    return None


def setup_logging():
    """Setup logging configuration with Supabase handler. Idempotent."""
    logger = logging.getLogger(LOGGER_NAME)
    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

    try:
        supabase_handler = SupabaseHandler()
        supabase_handler.setLevel(logging.INFO)
        supabase_handler.setFormatter(formatter)
        logger.addHandler(supabase_handler)
    except Exception as e:
        print(f"Failed to setup Supabase handler: {str(e)}")

    # Also add a file handler as backup
    try:
        log_dir = os.path.join(os.path.dirname(__file__), '..', 'logs')
        os.makedirs(log_dir, exist_ok=True)
        file_handler = logging.FileHandler(os.path.join(log_dir, 'app.log'))
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    except Exception as e:
        print(f"Failed to setup file handler: {str(e)}")

    return logger
