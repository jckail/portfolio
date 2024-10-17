#!/bin/bash

# Function to kill processes by name
kill_process() {
    process_name=$1
    pid=$(pgrep -f "$process_name")
    if [ ! -z "$pid" ]; then
        echo "Stopping $process_name (PID: $pid)"
        kill $pid
    else
        echo "$process_name is not running"
    fi
}

# Stop the FastAPI backend server
kill_process "uvicorn backend.main:app"

# Stop the frontend development server
kill_process "npm run dev"

echo "Development servers stopped"
