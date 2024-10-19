#!/bin/bash

echo "Starting local test environment..."

# Run kill_hanging.sh to terminate any existing processes
echo "Executing kill_hanging.sh to clean up any hanging processes..."
bash ./kill_hanging.sh

echo "Removing frontend/dist directory..."
rm -rf frontend/dist

echo "Building the frontend..."
cd frontend && npm run build

echo "Starting the backend..."
cd .. && uvicorn backend.app.main:app --host 0.0.0.0 --port 8080 --reload --log-level debug &

echo "Starting the frontend dev server..."
cd .. && cd frontend && npm run build && npm run dev -- --host 0.0.0.0 --port 5173 --debug &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit_status=$?
echo "A process has exited with status: $exit_status"
exit $exit_status
