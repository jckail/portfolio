#!/bin/bash

# Function to kill processes by port
kill_process_by_port() {
    local port=$1
    local pid=$(lsof -ti:$port)
    if [ -n "$pid" ]; then
        echo "Killing process on port $port (PID: $pid)..."
        kill -9 $pid
        echo "Process on port $port terminated."
    else
        echo "No process found on port $port."
    fi
}

# Function to kill processes by name
kill_process_by_name() {
    local process_name=$1
    local pids=$(pgrep -f "$process_name")
    if [ -n "$pids" ]; then
        echo "Killing $process_name processes..."
        echo $pids | xargs kill -9
        echo "$process_name processes terminated."
    else
        echo "No $process_name processes found."
    fi
}

# Kill process on port 5173 (frontend)
kill_process_by_port 5173

# Kill process on port 8000 (backend)
kill_process_by_port 8000

# Fallback: Kill Vite processes
kill_process_by_name "vite"

# Fallback: Kill FastAPI processes (uvicorn)
kill_process_by_name "uvicorn main:app"

# Fallback: Kill any Python processes related to the backend
kill_process_by_name "python.*backend/main.py"

echo "Cleanup complete."
