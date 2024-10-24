# QuickResume Backend

## Overview
The backend of QuickResume is built with FastAPI, providing a high-performance API layer for serving resume data and handling file operations. It features automatic API documentation, type checking, and efficient request handling.

## Features
- Fast and efficient API endpoints
- Automatic OpenAPI documentation
- Type validation with Pydantic
- Asynchronous request handling
- Comprehensive logging system
- PDF file serving capabilities

## API Documentation

### Endpoints

#### 1. Get Resume Data
```http
GET /api/resume_data
```
Returns formatted resume data including personal information, skills, experience, and projects.

Example Response:
```json
{
    "name": "John Doe",
    "title": "Software Engineer",
    "github": "https://github.com/johndoe",
    "linkedin": "https://linkedin.com/in/johndoe",
    "aboutMe": "Professional software engineer...",
    "technicalSkills": ["Python", "JavaScript", "React"],
    "experience": [
        {
            "title": "Senior Developer",
            "company": "Tech Corp",
            "date": "2020-Present",
            "responsibilities": ["Led team...", "Developed..."],
            "link": "https://techcorp.com"
        }
    ],
    "projects": [
        {
            "name": "Project Name",
            "description": "Project description...",
            "technologies": ["React", "Node.js"],
            "link": "https://project.com"
        }
    ]
}
```

#### 2. Serve Resume PDF
```http
GET /api/resume
```
Serves the resume PDF file.

Response: PDF file (application/pdf)

#### 3. Get Resume Filename
```http
GET /api/resume_file_name
```
Returns the current resume file name.

Example Response:
```json
{
    "resumeFileName": "JohnDoe_Resume.pdf"
}
```

#### 4. Log Frontend Messages
```http
POST /api/log
```
Logs messages from the frontend for debugging and monitoring.

Request Body:
```json
{
    "message": "Log message content"
}
```

Example Response:
```json
{
    "status": "success",
    "message": "Log written successfully"
}
```

## Development Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables:
```env
FLASK_APP=backend/main.py
ALLOWED_ORIGINS=http://localhost:5173
RESUME_FILE=YourResume.pdf
```

3. Run the development server:
```bash
uvicorn backend.app.main:app --reload --port 8080
```

## Logging System
- Logs are stored in `backend/app/logs/`
- Filename format: `frontend_YYYY_MM_DD_HH.logs`
- Includes timestamps and error tracking
- Automatic log rotation by hour

## Error Handling
- Comprehensive error messages
- HTTP status codes for different scenarios
- Error logging for debugging
- Graceful fallbacks for missing files

## Best Practices
- Use type hints for better code quality
- Implement proper error handling
- Follow REST API conventions
- Maintain clear documentation
