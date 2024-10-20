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

# Copy the .env file
COPY .env /app/.env

# Set environment variables
ENV PYTHONPATH=/app

# Expose the port the app runs on (default to 8080 if PORT is not set)
EXPOSE ${PORT:-8080}

# Install gettext-base for envsubst (needed for environment variable substitution)
RUN apt-get update && apt-get install -y gettext-base && rm -rf /var/lib/apt/lists/*

# Entry point to ensure .env is loaded and app is started properly
CMD ["sh", "-c", "export $(grep -v '^#' /app/.env | xargs) && echo 'Environment Variables:' && printenv && echo 'Starting application...' && ls -R /app && uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
