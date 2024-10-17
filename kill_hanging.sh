#!/bin/bash

# Function to kill processes
kill_process() {
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

# Kill Vite processes
kill_process "vite"

# Kill FastAPI processes (uvicorn)
kill_process "uvicorn main:app"

# Kill any Python processes related to the backend
kill_process "python.*backend/main.py"

echo "Cleanup complete."
