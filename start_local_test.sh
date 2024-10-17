#!/bin/bash

# Export environment variables from .env.development
export $(grep -v '^#' .env.development | xargs)

# Start the backend
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload &

# Start the frontend
cd frontend && npm run dev &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
