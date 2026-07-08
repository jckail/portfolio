#!/bin/bash
#
# Build and deploy the portfolio app to Google Cloud Run.
#
# Usage:
#   ./helpers/deploy.sh [--prod|--dev]
#
# Configuration (override via environment or .env):
#   GCP_PROJECT_ID   GCP project id            (default: portfolio-383615)
#   GCP_REGION       Cloud Run region          (default: us-central1)
#   SERVICE_NAME     Cloud Run service name    (default: quickresume)
#   AR_REPOSITORY    Artifact Registry repo    (default: portfolio)
#
# Prefer managing the underlying infrastructure (APIs, Artifact Registry,
# secrets, IAM) with Terraform in infra/ — this script only builds the image
# and deploys a new revision.

set -euo pipefail

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
            echo "  --dev:  Build development image locally"
            exit 1
            ;;
    esac
done

# Navigate to the project root directory
cd "$SCRIPT_DIR" || { echo "Failed to navigate to project root directory"; exit 1; }

# Get current git commit hash
GIT_COMMIT=$(git rev-parse HEAD)

# Load environment variables from .env file (handles quoted values and spaces,
# unlike the old `export $(cat .env | xargs)` approach)
if [ -f .env ]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
else
    echo "Error: .env file not found"
    exit 1
fi

# Deployment configuration (overridable via environment/.env)
GCP_PROJECT_ID="${GCP_PROJECT_ID:-portfolio-383615}"
GCP_REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-quickresume}"
AR_REPOSITORY="${AR_REPOSITORY:-portfolio}"
IMAGE_URI="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${AR_REPOSITORY}/${SERVICE_NAME}:${GIT_COMMIT}"

# Check if required environment variables are set
required_vars="SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE ADMIN_EMAIL RESUME_FILE ANTHROPIC_API_KEY SENDGRID_API_KEY"
for var in $required_vars; do
    if [ -z "${!var:-}" ]; then
        echo "Error: Required environment variable $var is not set in .env file"
        exit 1
    fi
done

# Set environment-specific variables
if [ "$ENVIRONMENT" = "prod" ]; then
    DOCKERFILE="helpers/Dockerfile.prod"
    ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-https://quickresume-292025398859.us-central1.run.app}"
    PRODUCTION_URL="${PRODUCTION_URL:-https://quickresume-292025398859.us-central1.run.app}"

    echo "Enabling required Google Cloud APIs..."
    gcloud services enable \
        run.googleapis.com \
        artifactregistry.googleapis.com \
        --project "${GCP_PROJECT_ID}"

    # Ensure the Artifact Registry repository exists (no-op if managed by Terraform)
    if ! gcloud artifacts repositories describe "${AR_REPOSITORY}" \
            --location "${GCP_REGION}" --project "${GCP_PROJECT_ID}" >/dev/null 2>&1; then
        echo "Creating Artifact Registry repository '${AR_REPOSITORY}'..."
        gcloud artifacts repositories create "${AR_REPOSITORY}" \
            --repository-format=docker \
            --location "${GCP_REGION}" \
            --project "${GCP_PROJECT_ID}"
    fi

    gcloud auth configure-docker "${GCP_REGION}-docker.pkg.dev" --quiet
else
    DOCKERFILE="helpers/Dockerfile.dev"
    ALLOWED_ORIGINS="http://localhost:5173"
    PRODUCTION_URL="http://localhost:8080"
fi

echo "Building Docker image for $ENVIRONMENT environment..."
docker build -t "${IMAGE_URI}" --platform linux/amd64 -f "${DOCKERFILE}" .

if [ "$ENVIRONMENT" = "prod" ]; then
    docker push "${IMAGE_URI}"

    echo "Deploying to Cloud Run..."
    gcloud run deploy "${SERVICE_NAME}" \
        --image "${IMAGE_URI}" \
        --platform managed \
        --region "${GCP_REGION}" \
        --project "${GCP_PROJECT_ID}" \
        --memory "${CLOUD_RUN_MEMORY:-512Mi}" \
        --cpu "${CLOUD_RUN_CPU:-1}" \
        --min-instances "${CLOUD_RUN_MIN_INSTANCES:-0}" \
        --max-instances "${CLOUD_RUN_MAX_INSTANCES:-3}" \
        --set-env-vars "SUPABASE_URL=${SUPABASE_URL}" \
        --set-env-vars "SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}" \
        --set-env-vars "SUPABASE_SERVICE_ROLE=${SUPABASE_SERVICE_ROLE}" \
        --set-env-vars "ALLOWED_ORIGINS=${ALLOWED_ORIGINS}" \
        --set-env-vars "PRODUCTION_URL=${PRODUCTION_URL}" \
        --set-env-vars "ADMIN_EMAIL=${ADMIN_EMAIL}" \
        --set-env-vars "RESUME_FILE=${RESUME_FILE}" \
        --set-env-vars "GIT_COMMIT=${GIT_COMMIT}" \
        --set-env-vars "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}" \
        --set-env-vars "SENDGRID_API_KEY=${SENDGRID_API_KEY}" \
        --allow-unauthenticated

    echo "Deployment complete! Checking service health..."
    # Get the service URL and wait for it to be ready
    SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
        --platform managed --region "${GCP_REGION}" --project "${GCP_PROJECT_ID}" \
        --format 'value(status.url)')
    echo "Service URL: ${SERVICE_URL}"

    # Wait for the service to be ready (up to 60 seconds)
    echo "Waiting for service to be ready..."
    response=""
    for i in {1..12}; do
        response=$(curl -s "${SERVICE_URL}/api/health" || true)
        if [[ "$response" == *'"status":"healthy"'* ]] && [[ "$response" == *'"status":"operational"'* ]]; then
            echo "Service is healthy!"
            echo "Health check response:"
            echo "$response" | jq .
            echo "Deployed version: $(echo "$response" | jq -r '.checks.version.hash')"

            echo -e "\nTesting email functionality..."
            python helpers/test_email.py --prod

            exit 0
        fi
        echo "Waiting for service to be ready... (attempt $i/12)"
        sleep 5
    done

    echo "Error: Service health check failed after 60 seconds"
    echo "Last response:"
    echo "$response" | jq . || echo "$response"
    exit 1
else
    echo "Development image built: ${IMAGE_URI}"
    echo "You can now run ./helpers/local_test.sh to start the development servers"
fi
