# Use Python 3.11 slim as the base image
FROM python:3.11-slim

# Install Node.js and npm
RUN apt-get update && apt-get install -y nodejs npm

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend application code
COPY backend/ ./backend/

# Copy the frontend application code
COPY frontend/ ./frontend/

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

# Install frontend dependencies
WORKDIR /app/frontend
RUN npm install

# Return to the app directory
WORKDIR /app

# Set the command to run the application
CMD ["./entrypoint.sh"]
