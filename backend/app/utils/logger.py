import logging
from backend.app.utils.supabase_client import supabase
import asyncio
import socket
import os

class SupabaseHandler(logging.Handler):
    def __init__(self):
        super().__init__()
        self.hostname = socket.gethostname()
        self.ip_address = socket.gethostbyname(self.hostname)

    def emit(self, record):
        try:
            # Format the message
            msg = self.format(record)
            
            # Create metadata
            metadata = {
                'filename': record.filename,
                'funcName': record.funcName,
                'lineno': record.lineno,
                'hostname': self.hostname
            }
            
            # If there's an exception, add it to metadata
            if record.exc_info:
                metadata['exception'] = self.formatException(record.exc_info)

            # Create asyncio task to store log
            loop = asyncio.get_event_loop()
            loop.create_task(
                supabase.store_log(
                    level=record.levelname,
                    message=msg,
                    metadata=metadata,
                    source="backend",
                    ip_address=self.ip_address
                )
            )
        except Exception as e:
            # Fallback to writing to file if Supabase logging fails
            fallback_log_path = os.path.join(os.path.dirname(__file__), '..', 'logs', 'fallback.log')
            with open(fallback_log_path, 'a') as f:
                f.write(f"Failed to log to Supabase: {str(e)}\nOriginal message: {msg}\n")

def setup_logging():
    """Setup logging configuration with Supabase handler"""
    # Create logger
    logger = logging.getLogger('quickresume')
    logger.setLevel(logging.INFO)
    
    # Create Supabase handler
    supabase_handler = SupabaseHandler()
    supabase_handler.setLevel(logging.INFO)
    
    # Create formatter
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    supabase_handler.setFormatter(formatter)
    
    # Add handler to logger
    logger.addHandler(supabase_handler)
    
    # Also add a file handler as backup
    log_dir = os.path.join(os.path.dirname(__file__), '..', 'logs')
    os.makedirs(log_dir, exist_ok=True)
    file_handler = logging.FileHandler(os.path.join(log_dir, 'app.log'))
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    
    return logger
