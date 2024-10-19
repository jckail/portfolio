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

# Expose the port the app runs on
EXPOSE 8080

# Command to run the application
CMD ["sh", "-c", "echo 'Starting application...' && ls -R /app && uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT"]
