#!/bin/bash

# Exit on any error
set -e

# Default to prod if no environment is specified
ENVIRONMENT=${1:-prod}

# Validate environment argument
if [[ "$ENVIRONMENT" != "prod" && "$ENVIRONMENT" != "dev" ]]; then
    echo "Usage: $0 [prod|dev]"
    echo "  prod: Deploy production environment (default)"
    echo "  dev:  Deploy development environment"
    exit 1
fi

# Load environment variables from .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "Error: .env file not found"
    exit 1
fi

# Check if required environment variables are set
required_vars="SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE ADMIN_EMAIL RESUME_FILE SUPABASE_JWT_SECRET SUPABASE_PW"
for var in $required_vars; do
    if [ -z "${!var}" ]; then
        echo "Error: Required environment variable $var is not set in .env file"
        exit 1
    fi
done

# Set environment-specific variables
if [ "$ENVIRONMENT" = "prod" ]; then
    IMAGE_NAME="quickresume:prod"
    DOCKERFILE="Dockerfile.prod"
    ALLOWED_ORIGINS="https://portfolio-292025398859.us-central1.run.app"
    PRODUCTION_URL="https://portfolio-292025398859.us-central1.run.app"
else
    IMAGE_NAME="quickresume:dev"
    DOCKERFILE="Dockerfile.dev"
    ALLOWED_ORIGINS="http://localhost:5173"
    PRODUCTION_URL="http://localhost:8080"
fi

echo "Building Docker image for $ENVIRONMENT environment..."
docker build -t ${IMAGE_NAME} --platform linux/amd64 -f ${DOCKERFILE} .

if [ "$ENVIRONMENT" = "prod" ]; then
    # Tag for Google Container Registry
    docker tag ${IMAGE_NAME} gcr.io/portfolio-383615/${IMAGE_NAME}
    docker push gcr.io/portfolio-383615/${IMAGE_NAME}

    echo "Deploying to Cloud Run..."
    gcloud run deploy quickresume \
        --image gcr.io/portfolio-383615/${IMAGE_NAME} \
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
        --allow-unauthenticated

    echo "Deployment complete! Checking service health..."
    # Get the service URL and wait for it to be ready
    SERVICE_URL=$(gcloud run services describe quickresume --platform managed --region us-central1 --format 'value(status.url)')
    echo "Service URL: ${SERVICE_URL}"

    # Wait for the service to be ready (up to 60 seconds)
    echo "Waiting for service to be ready..."
    for i in {1..12}; do
        if curl -s -f "${SERVICE_URL}/api/health" > /dev/null 2>&1; then
            echo "Service is healthy!"
            curl -s "${SERVICE_URL}/api/health" | jq .
            exit 0
        fi
        echo "Waiting for service to be ready... (attempt $i/12)"
        sleep 5
    done

    echo "Error: Service health check failed after 60 seconds"
    exit 1
else
    echo "Development environment setup complete"
    echo "You can now run ./local_test.sh to start the development servers"
fi
