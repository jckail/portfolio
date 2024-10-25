#!/bin/bash

# Exit on any error
set -e

# Load environment variables from .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "Error: .env file not found"
    exit 1
fi

# Check if required environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ] || [ -z "$SUPABASE_SERVICE_ROLE" ]; then
    echo "Error: Required environment variables are not set in .env file"
    echo "Please ensure SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE are set"
    exit 1
fi

# Use consistent image name
IMAGE_NAME="gcr.io/portfolio-383615/quickresume:v2"

echo "Building and pushing Docker image..."
docker build -t ${IMAGE_NAME} --platform linux/amd64 .
docker push ${IMAGE_NAME}

echo "Deploying to Cloud Run..."
gcloud run deploy quickresume \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region us-central1 \
  --set-env-vars "SUPABASE_URL=${SUPABASE_URL},SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY},SUPABASE_SERVICE_ROLE=${SUPABASE_SERVICE_ROLE}" \
  --allow-unauthenticated

echo "Deployment complete! Checking service health..."
# Get the service URL and wait for it to be ready
SERVICE_URL=$(gcloud run services describe quickresume --platform managed --region us-central1 --format 'value(status.url)')
echo "Service URL: ${SERVICE_URL}"

# Wait for the service to be ready (up to 60 seconds)
echo "Waiting for service to be ready..."
for i in {1..12}; do
    if curl -s -f "${SERVICE_URL}/health" > /dev/null 2>&1; then
        echo "Service is healthy!"
        curl -s "${SERVICE_URL}/health" | jq .
        exit 0
    fi
    echo "Waiting for service to be ready... (attempt $i/12)"
    sleep 5
done

echo "Error: Service health check failed after 60 seconds"
exit 1
