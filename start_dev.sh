#!/bin/bash

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for required commands
if ! command_exists uvicorn; then
    echo "Error: uvicorn is not installed. Please install it to run the backend server."
    exit 1
fi

if ! command_exists npm; then
    echo "Error: npm is not installed. Please install it to run the frontend server."
    exit 1
fi

# Set default port numbers
BACKEND_PORT=${BACKEND_PORT:-8000}
FRONTEND_PORT=${FRONTEND_PORT:-5173}

# Start the backend FastAPI server
echo "Starting FastAPI backend server on port $BACKEND_PORT..."
uvicorn backend.main:app --reload --host 0.0.0.0 --port $BACKEND_PORT &
BACKEND_PID=$!

# Wait for the backend to start with a timeout
echo "Waiting for backend to start..."
TIMEOUT=30
while ! nc -z localhost $BACKEND_PORT; do
  if [ $TIMEOUT -le 0 ]; then
    echo "Error: Backend failed to start within the allocated time."
    kill $BACKEND_PID
    exit 1
  fi
  sleep 1
  ((TIMEOUT--))
done
echo "Backend started successfully."

# Start the frontend development server
echo "Starting frontend development server..."
cd frontend
if ! npm run dev -- --port $FRONTEND_PORT > frontend.log 2>&1 & then
    echo "Error: Failed to start the frontend development server."
    kill $BACKEND_PID
    exit 1
fi
FRONTEND_PID=$!

# Wait for the frontend to start
echo "Waiting for frontend to start..."
TIMEOUT=30
while ! grep -q "Local:" frontend.log; do
  if [ $TIMEOUT -le 0 ]; then
    echo "Error: Frontend failed to start within the allocated time."
    kill $BACKEND_PID $FRONTEND_PID
    exit 1
  fi
  sleep 1
  ((TIMEOUT--))
done
echo "Frontend started successfully."

# Display the URLs
BACKEND_URL="http://localhost:$BACKEND_PORT"
FRONTEND_URL=$(grep "Local:" frontend.log | awk '{print $2}')
echo "Backend is running at: $BACKEND_URL"
echo "Frontend is running at: $FRONTEND_URL"

# Wait for any process to exit
wait -n

# Cleanup
kill $BACKEND_PID $FRONTEND_PID

echo "Development servers stopped."
exit 0
