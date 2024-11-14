import time
import os
import sys
import psutil
import importlib
from datetime import datetime
from functools import wraps
from typing import Callable, Dict, List, Set
from pathlib import Path

# Capture the initial import time and process
INITIAL_START_TIME = time.time()
PROCESS = psutil.Process()
IMPORTED_MODULES: Set[str] = set()

def track_import_time(name: str) -> float:
    """Track the import time of a module"""
    start = time.time()
    try:
        importlib.import_module(name)
        end = time.time()
        return end - start
    except ImportError:
        return 0.0

class StartupTelemetry:
    def __init__(self):
        self.startup_times: Dict[str, float] = {}
        self.total_startup_time: float = 0
        self.dependency_times: List[Dict[str, float]] = []
        self.initial_start_time: float = INITIAL_START_TIME
        self.app_ready_time: float = 0
        self.module_import_times: Dict[str, float] = {}
        self.system_metrics: Dict[str, Dict] = {}
        
        # Track key FastAPI-related imports
        self._track_key_imports()
        
        # Ensure the startup_logs directory exists
        self.logs_dir = Path("backend/app/utils/startup_logs")
        self.logs_dir.mkdir(parents=True, exist_ok=True)

    def _track_key_imports(self):
        """Track import times for key modules"""
        key_modules = [
            'fastapi',
            'uvicorn',
            'starlette',
            'pydantic',
            'sqlalchemy',
            'asyncio',
            'aiohttp',
            'dotenv'
        ]
        for module in key_modules:
            if module not in IMPORTED_MODULES:
                import_time = track_import_time(module)
                if import_time > 0:
                    self.module_import_times[module] = import_time
                    IMPORTED_MODULES.add(module)

    def _capture_system_metrics(self):
        """Capture system resource metrics"""
        try:
            cpu_percent = PROCESS.cpu_percent()
            memory_info = PROCESS.memory_info()
            
            self.system_metrics.update({
                'timestamp': time.time() - self.initial_start_time,
                'cpu': {
                    'percent': cpu_percent,
                    'num_threads': PROCESS.num_threads()
                },
                'memory': {
                    'rss': memory_info.rss / 1024 / 1024,  # MB
                    'vms': memory_info.vms / 1024 / 1024   # MB
                },
                'io': {
                    'read_bytes': PROCESS.io_counters().read_bytes,
                    'write_bytes': PROCESS.io_counters().write_bytes
                }
            })
        except Exception as e:
            self.system_metrics['error'] = str(e)

    def log_startup_time(self, app_name: str = "FastAPI"):
        def decorator(startup_func: Callable):
            @wraps(startup_func)
            async def wrapper(*args, **kwargs):
                # Record pre-function metrics
                pre_func_time = time.time()
                self._capture_system_metrics()
                
                # Calculate initialization time before function
                pre_startup_time = pre_func_time - self.initial_start_time
                self.startup_times["Pre-Startup Initialization"] = pre_startup_time
                
                # Execute the startup function
                result = await startup_func(*args, **kwargs)
                
                # Record post-function metrics
                self.app_ready_time = time.time()
                self._capture_system_metrics()
                
                # Calculate detailed timings
                startup_func_time = self.app_ready_time - pre_func_time
                total_time = self.app_ready_time - self.initial_start_time
                
                # Store timing data
                self.total_startup_time = total_time
                self.startup_times.update({
                    "Module Imports": sum(self.module_import_times.values()),
                    f"{app_name} Startup Function": startup_func_time,
                    "Total Time": total_time
                })
                
                # Generate log file with timestamp
                self._write_startup_log()
                
                return result
            return wrapper
        return decorator

    def measure_dependency(self, dependency_name: str):
        def decorator(func: Callable):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Record pre-dependency metrics
                start_time = time.time()
                pre_cpu = PROCESS.cpu_percent()
                pre_memory = PROCESS.memory_info()
                
                # Execute the dependency function
                result = await func(*args, **kwargs)
                
                # Record post-dependency metrics
                end_time = time.time()
                post_cpu = PROCESS.cpu_percent()
                post_memory = PROCESS.memory_info()
                
                # Calculate metrics
                execution_time = end_time - start_time
                memory_delta = (post_memory.rss - pre_memory.rss) / 1024 / 1024  # MB
                
                self.dependency_times.append({
                    "name": dependency_name,
                    "execution_time": execution_time,
                    "start_offset": start_time - self.initial_start_time,
                    "cpu_percent": post_cpu,
                    "memory_delta_mb": memory_delta
                })
                
                return result
            return wrapper
        return decorator

    def _write_startup_log(self):
        """Write detailed startup telemetry data to a timestamped log file."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_file = self.logs_dir / f"{timestamp}.txt"
        
        with open(log_file, "w") as f:
            f.write("FastAPI Application Startup Telemetry\n")
            f.write("===================================\n\n")
            
            # Write process information
            f.write("Process Information:\n")
            f.write("-------------------\n")
            f.write(f"Process ID: {PROCESS.pid}\n")
            f.write(f"Parent Process ID: {PROCESS.ppid()}\n")
            f.write(f"Python Version: {sys.version}\n\n")
            
            # Write total startup time
            f.write(f"Total Startup Time: {self.total_startup_time:.4f} seconds\n")
            f.write("----------------------------------------\n\n")
            
            # Write module import times
            f.write("Module Import Times:\n")
            f.write("-------------------\n")
            for module, import_time in self.module_import_times.items():
                f.write(f"{module}: {import_time:.4f} seconds\n")
            f.write("\n")
            
            # Write startup phases
            f.write("Startup Phases:\n")
            f.write("--------------\n")
            for phase, time_taken in self.startup_times.items():
                f.write(f"{phase}: {time_taken:.4f} seconds\n")
            f.write("\n")
            
            # Write dependency times with system metrics
            if self.dependency_times:
                f.write("Dependency Initialization Details:\n")
                f.write("--------------------------------\n")
                for dep in sorted(self.dependency_times, key=lambda x: x["start_offset"]):
                    f.write(f"\n{dep['name']}:\n")
                    f.write(f"  - Started at: +{dep['start_offset']:.4f}s\n")
                    f.write(f"  - Duration: {dep['execution_time']:.4f}s\n")
                    f.write(f"  - CPU Usage: {dep['cpu_percent']:.1f}%\n")
                    f.write(f"  - Memory Impact: {dep['memory_delta_mb']:.2f}MB\n")
            
            # Write final system metrics
            f.write("\nFinal System Metrics:\n")
            f.write("-------------------\n")
            if self.system_metrics:
                f.write(f"CPU Usage: {self.system_metrics['cpu']['percent']:.1f}%\n")
                f.write(f"Memory RSS: {self.system_metrics['memory']['rss']:.2f}MB\n")
                f.write(f"Memory VMS: {self.system_metrics['memory']['vms']:.2f}MB\n")
                f.write(f"IO Read: {self.system_metrics['io']['read_bytes']/1024:.2f}KB\n")
                f.write(f"IO Write: {self.system_metrics['io']['write_bytes']/1024:.2f}KB\n")

# Create a global instance for use across the application
startup_telemetry = StartupTelemetry()
