# Use an official Python runtime as the base image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY resume_app/ ./resume_app/
COPY entrypoint.sh .

# Make the entrypoint script executable
RUN chmod +x entrypoint.sh

# Set environment variables
ENV API_URL=http://localhost:8000

# Expose the ports for both frontend and backend
EXPOSE 8000 8080

# Set the command to run the application
CMD ["./entrypoint.sh"]