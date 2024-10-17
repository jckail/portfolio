#!/bin/bash

# Start the backend
uvicorn backend.app.main:app --host 0.0.0.0 --port 8080 --reload &

# Start the frontend
cd frontend && npm run build  && npm run dev -- --host 0.0.0.0 --port 5173 &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
