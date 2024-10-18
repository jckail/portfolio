#!/bin/bash

echo "Starting local test environment..."

# Run kill_hanging.sh to terminate any existing processes
echo "Executing kill_hanging.sh to clean up any hanging processes..."
bash ./kill_hanging.sh

echo "Starting the backend..."
uvicorn backend.app.main:app --host 0.0.0.0 --port 8080 --reload --log-level debug &

echo "Starting the frontend..."
cd frontend && npm run build && npm run dev -- --host 0.0.0.0 --port 5173 --debug &

echo "Both backend and frontend services have been started."
echo "Waiting for any process to exit..."

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit_status=$?
echo "A process has exited with status: $exit_status"
exit $exit_status
