# Stage 1: Python backend
FROM python:3.11-slim AS backend

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend application code
COPY backend/ ./backend/

# Stage 2: Node.js frontend
FROM node:16 AS frontend

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm install

# Copy the frontend application code
COPY frontend/ ./

# Build the React app
RUN npm run build

# Stage 3: Final image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Copy backend from the backend stage
COPY --from=backend /app /app

# Copy frontend build from the frontend stage
COPY --from=frontend /app/dist /app/frontend/dist

# Copy the images directory
COPY images/ ./images/

# Copy entrypoint script
COPY entrypoint.sh .

# Make the entrypoint script executable
RUN chmod +x entrypoint.sh

# Set default environment variable for API_URL
ENV API_URL=http://localhost:8000

# Expose the ports for both frontend and backend
EXPOSE 8000 5173

# Set the command to run the application
CMD ["./entrypoint.sh"]
