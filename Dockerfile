# Stage 1: Build the React frontend
FROM node:14 as frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the FastAPI backend
FROM python:3.11-slim
WORKDIR /app

# Copy the frontend build
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Copy favicon files (if they exist)
COPY --from=frontend-build /app/frontend/public/favicon* /app/frontend/dist/

# Install backend dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code
COPY backend /app/backend

# Create the images directory and copy images
COPY images /app/images

# Set environment variables
ENV PYTHONPATH=/app

# Entry point script
COPY <<'EOF' /app/start.sh
#!/bin/sh
echo "Starting application..."
echo "Checking environment variables..."

# List of required environment variables
required_vars="SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE ALLOWED_ORIGINS PRODUCTION_URL ADMIN_EMAIL RESUME_FILE SUPABASE_JWT_SECRET SUPABASE_PW"

# Check each required variable
for var in $required_vars; do
    if [ -z "$(eval echo \$$var)" ]; then
        echo "Error: Required environment variable $var is not set"
        exit 1
    fi
done

echo "Environment check passed"
# Use PORT environment variable provided by Cloud Run, defaulting to 8080 if not set
exec uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8080}
EOF

RUN chmod +x /app/start.sh
CMD ["/app/start.sh"]
