import logging
from ..utils.supabase_client import supabase
import asyncio
import socket
import os

class SupabaseHandler(logging.Handler):
    def __init__(self):
        super().__init__()
        self._queue = asyncio.Queue()
        self._batch_size = 50
        self._flush_interval = 5  # seconds
        self._hostname = socket.gethostname()
        self._ip_address = socket.gethostbyname(self._hostname)
        asyncio.create_task(self._flush_queue())

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
                
                if batch:
                    # Format all records in batch
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
                    
                    # Store batch of logs
                    try:
                        await supabase.store_logs_batch(formatted_logs)
                    except Exception as e:
                        # Fallback to file logging if Supabase fails
                        self._fallback_log(f"Failed to store log batch: {str(e)}")
                        for log in formatted_logs:
                            self._fallback_log(f"Failed log: {log}")
            except Exception as e:
                self._fallback_log(f"Error in _flush_queue: {str(e)}")
            await asyncio.sleep(0.1)

    def emit(self, record):
        try:
            asyncio.create_task(self._queue.put(record))
        except Exception as e:
            self._fallback_log(f"Failed to queue log: {str(e)}\nOriginal message: {record.getMessage()}")

    def _fallback_log(self, message: str):
        """Write to fallback log file when Supabase logging fails"""
        fallback_log_path = os.path.join(os.path.dirname(__file__), '..', 'logs', 'fallback.log')
        os.makedirs(os.path.dirname(fallback_log_path), exist_ok=True)
        with open(fallback_log_path, 'a') as f:
            f.write(f"{message}\n")

def setup_logging():
    """Setup logging configuration with Supabase handler"""
    # Create logger
    logger = logging.getLogger('quickresume')
    logger.setLevel(logging.INFO)
    
    # Create Supabase handler
    try:
        supabase_handler = SupabaseHandler()
        supabase_handler.setLevel(logging.INFO)
        
        # Create formatter
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        supabase_handler.setFormatter(formatter)
        
        # Add handler to logger
        logger.addHandler(supabase_handler)
    except Exception as e:
        print(f"Failed to setup Supabase handler: {str(e)}")
    
    # Also add a file handler as backup
    try:
        log_dir = os.path.join(os.path.dirname(__file__), '..', 'logs')
        os.makedirs(log_dir, exist_ok=True)
        file_handler = logging.FileHandler(os.path.join(log_dir, 'app.log'))
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    except Exception as e:
        print(f"Failed to setup file handler: {str(e)}")
    
    return logger
