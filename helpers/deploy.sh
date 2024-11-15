#!/bin/bash

# Exit on any error
set -e

# Default to prod if no argument is specified
ENVIRONMENT="prod"

# Get the absolute path to the project root (one directory up from this script)
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dev)
            ENVIRONMENT="dev"
            shift
            ;;
        --prod)
            ENVIRONMENT="prod"
            shift
            ;;
        *)
            echo "Invalid argument: $1"
            echo "Usage: $0 [--prod|--dev]"
            echo "  --prod: Deploy production environment (default)"
            echo "  --dev:  Deploy development environment"
            exit 1
            ;;
    esac
done

# Navigate to the project root directory
cd "$SCRIPT_DIR" || { echo "Failed to navigate to project root directory"; exit 1; }

# Get current git commit hash
GIT_COMMIT=$(git rev-parse HEAD)

# Load environment variables from .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "Error: .env file not found"
    exit 1
fi

# Check if required environment variables are set
required_vars="SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE ADMIN_EMAIL RESUME_FILE SUPABASE_JWT_SECRET SUPABASE_PW ANTHROPIC_API_KEY"
for var in $required_vars; do
    if [ -z "${!var}" ]; then
        echo "Error: Required environment variable $var is not set in .env file"
        exit 1
    fi
done

# Set environment-specific variables
if [ "$ENVIRONMENT" = "prod" ]; then
    DOCKERFILE="helpers/Dockerfile.prod"
    ALLOWED_ORIGINS="https://portfolio-292025398859.us-central1.run.app"
    PRODUCTION_URL="https://portfolio-292025398859.us-central1.run.app"
else
    DOCKERFILE="helpers/Dockerfile.dev"
    ALLOWED_ORIGINS="http://localhost:5173"
    PRODUCTION_URL="http://localhost:8080"
fi

IMAGE_NAME="${ENVIRONMENT}/quickresume:${GIT_COMMIT}"
echo "Building Docker image for $ENVIRONMENT environment..."
docker build -t ${IMAGE_NAME} --platform linux/amd64 -f ${DOCKERFILE} .

if [ "$ENVIRONMENT" = "prod" ]; then
    # Tag with git commit hash and push to GCR
    docker tag ${IMAGE_NAME} gcr.io/portfolio-383615/quickresume:${GIT_COMMIT}
    docker push gcr.io/portfolio-383615/quickresume:${GIT_COMMIT}

    echo "Deploying to Cloud Run..."
    gcloud run deploy quickresume \
        --image gcr.io/portfolio-383615/quickresume:${GIT_COMMIT} \
        --platform managed \
        --region us-central1 \
        --set-env-vars "SUPABASE_URL=${SUPABASE_URL}" \
        --set-env-vars "SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}" \
        --set-env-vars "SUPABASE_SERVICE_ROLE=${SUPABASE_SERVICE_ROLE}" \
        --set-env-vars "ALLOWED_ORIGINS=${ALLOWED_ORIGINS}" \
        --set-env-vars "PRODUCTION_URL=${PRODUCTION_URL}" \
        --set-env-vars "ADMIN_EMAIL=${ADMIN_EMAIL}" \
        --set-env-vars "RESUME_FILE=${RESUME_FILE}" \
        --set-env-vars "SUPABASE_JWT_SECRET=${SUPABASE_JWT_SECRET}" \
        --set-env-vars "SUPABASE_PW=${SUPABASE_PW}" \
        --set-env-vars "GIT_COMMIT=${GIT_COMMIT}" \
        --set-env-vars "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}" \
        --allow-unauthenticated

    echo "Deployment complete! Checking service health..."
    # Get the service URL and wait for it to be ready
    SERVICE_URL=$(gcloud run services describe quickresume --platform managed --region us-central1 --format 'value(status.url)')
    echo "Service URL: ${SERVICE_URL}"

    # Wait for the service to be ready (up to 60 seconds)
    echo "Waiting for service to be ready..."
    for i in {1..12}; do
        response=$(curl -s "${SERVICE_URL}/api/health")
        if [[ "$response" == *'"status":"healthy"'* ]] && [[ "$response" == *'"checks":{"database":{"status":"operational"'* ]]; then
            echo "Service is healthy!"
            echo "Health check response:"
            echo "$response" | jq .
            echo "Deployed version: $(echo "$response" | jq -r '.checks.version.hash')"
            exit 0
        fi
        echo "Waiting for service to be ready... (attempt $i/12)"
        sleep 5
    done

    echo "Error: Service health check failed after 60 seconds"
    echo "Last response:"
    echo "$response" | jq .
    exit 1
else
    echo "Development environment setup complete"
    echo "You can now run ./helpers/local_test.sh to start the development servers"
fi
