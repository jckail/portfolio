# Development Dockerfile
FROM node:18-alpine as frontend-build

WORKDIR /app/frontend
COPY ../frontend/package*.json ./
RUN npm install
COPY ../frontend/ ./

# Build frontend with development configuration
ENV NODE_ENV=development
RUN npm run build

# Backend setup
FROM python:3.12.3-slim
WORKDIR /app

# Copy the frontend build
COPY --from=frontend-build /app/frontend/dist/ /app/frontend/dist/

# Create directory for favicon files
RUN mkdir -p /app/frontend/dist/public/

# Copy favicon files (if they exist)
COPY --from=frontend-build /app/frontend/public/favicon* /app/frontend/dist/public/

# Install backend dependencies
COPY ../requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code
COPY ../backend /app/backend/

# Set environment variables
ENV PYTHONPATH=/app
ENV NODE_ENV=development

# Entry point script
COPY <<EOF /app/start.sh
#!/bin/sh
echo "Starting development environment..."
echo "Checking environment variables..."

# List of required environment variables
required_vars="SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE ALLOWED_ORIGINS PRODUCTION_URL ADMIN_EMAIL RESUME_FILE SUPABASE_JWT_SECRET SUPABASE_PW"

# Check each required variable
for var in \$required_vars; do
    if [ -z "\$(eval echo \\\$\${var})" ]; then
        echo "Error: Required environment variable \$var is not set"
        exit 1
    fi
done

echo "Environment check passed"
exec uvicorn backend.app.main:app --host 0.0.0.0 --port \${PORT:-8080} --reload
EOF

RUN chmod +x /app/start.sh
CMD ["/app/start.sh"]
