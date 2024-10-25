#!/bin/bash

# Get the absolute path to the project root (where this script is located)
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
echo "Script directory: $SCRIPT_DIR"

# Navigate to the project root directory
cd "$SCRIPT_DIR" || { echo "Failed to navigate to script directory"; exit 1; }

echo "Starting local test environment..."

# Run kill_hanging.sh to terminate any existing processes
echo "Executing kill_hanging.sh to clean up any hanging processes..."
bash ./kill_hanging.sh

echo "Removing frontend/dist directory..."
rm -rf frontend/dist

echo "Building the frontend..."
if cd "$SCRIPT_DIR/frontend"; then
  npm run build
else
  echo "Failed to navigate to 'frontend' directory. Ensure the folder exists."
  exit 1
fi

echo "Starting the backend..."
cd "$SCRIPT_DIR" || { echo "Failed to navigate back to script directory"; exit 1; }
uvicorn backend.app.main:app --host 0.0.0.0 --port 8080 --reload --reload-dir backend --log-level debug &

# Function to check the health of the backend with exponential backoff
check_health() {
  echo "Checking backend health at http://0.0.0.0:8080/api/health..."
  local attempt=1
  local max_attempts=15
  local delay=2

  while [ $attempt -le $max_attempts ]; do
    response=$(curl -s http://0.0.0.0:8080/api/health)
    if [[ "$response" == *'"status":"healthy"'* ]] && [[ "$response" == *'"database_status":"operational"'* ]]; then
      echo "Backend is healthy."
      return 0  # Success
    fi
    echo "Backend not healthy yet. Attempt $attempt/$max_attempts. Retrying in $delay seconds..."
    sleep $delay
    attempt=$((attempt + 1))
    delay=$((delay ))  # Exponential backoff
  done

  echo "Backend health check failed after $max_attempts attempts."
  return 1  # Failure
}

# Wait for the backend to become healthy before starting the frontend dev server
if check_health; then
  echo "Starting the frontend dev server..."
  cd "$SCRIPT_DIR/frontend" || { echo "Failed to navigate to 'frontend' directory"; exit 1; }
  npm run dev -- --host 0.0.0.0 --port 5173 --debug &
else
  echo "Skipping frontend dev server startup due to backend health check failure."
  exit 1  # Exit with failure status if the backend isn't healthy
fi

# Wait for any background process to exit
wait

# Exit with the status of the first process that exits
exit_status=$?
echo "A process has exited with status: $exit_status"
exit $exit_status
