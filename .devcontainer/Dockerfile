# Development Dockerfile
FROM node:22-alpine AS frontend-build

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
# Required variables are validated by backend/app/main.py against
# config.REQUIRED_ENV_VARS, the single source of truth. A second list here
# drifted from it and refused to boot without optional settings.
export PORT=\${PORT:-8080}
exec uvicorn backend.app.main:app --host 0.0.0.0 --port \${PORT:-8080} --reload
EOF

RUN chmod +x /app/start.sh
CMD ["/app/start.sh"]
