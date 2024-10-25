import logging
from backend.app.utils.supabase_client import supabase
import asyncio
import socket
import os

class SupabaseHandler(logging.Handler):
    def __init__(self):
        super().__init__()
        self._hostname = None
        self._ip_address = None

    @property
    def hostname(self):
        if self._hostname is None:
            try:
                self._hostname = socket.gethostname()
            except:
                self._hostname = 'unknown'
        return self._hostname

    @property
    def ip_address(self):
        if self._ip_address is None:
            try:
                self._ip_address = socket.gethostbyname(self.hostname)
            except:
                self._ip_address = '127.0.0.1'
        return self._ip_address

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
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
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
            os.makedirs(os.path.dirname(fallback_log_path), exist_ok=True)
            with open(fallback_log_path, 'a') as f:
                f.write(f"Failed to log to Supabase: {str(e)}\nOriginal message: {msg}\n")

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
