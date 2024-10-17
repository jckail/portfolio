#!/bin/bash

# Start the backend with hot reloading
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload &

# Start the frontend
cd frontend && npm run dev -- --host 0.0.0.0 &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
