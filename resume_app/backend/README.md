# Backend for QuickResume

This backend is built using FastAPI, a modern, fast (high-performance) web framework for building APIs with Python 3.6+ based on standard Python type hints.

## Why FastAPI?

FastAPI was chosen for this project for several reasons:

1. **Performance**: FastAPI is one of the fastest Python frameworks available, which makes it ideal for handling multiple requests efficiently.

2. **Easy integration**: It allows easy integration with other projects and services, which is crucial for linking various components to my personal website.

3. **Interactive API documentation**: FastAPI automatically generates interactive API documentation (with Swagger UI), making it easier to test and understand the API endpoints.

4. **Type checking**: With its use of Python type hints, it provides better code quality and reduces the chances of runtime errors.

5. **Asynchronous support**: FastAPI fully supports asynchronous programming, allowing for efficient handling of concurrent requests.

## Features and Demonstrations

This backend includes several features that showcase the capabilities of FastAPI and demonstrate my skills:

1. **Resume Data API**: Endpoints for retrieving various sections of my resume dynamically.

2. **FastAPI Stress Test**: An interactive endpoint that demonstrates FastAPI's performance under load.

3. **Asynchronous Operations**: Examples of how to efficiently handle time-consuming operations without blocking the server.

4. **WebSocket Integration**: Real-time communication capabilities for interactive features.

5. **Custom Middleware**: Demonstration of how to extend FastAPI's functionality with custom middleware.

6. **Data Validation**: Utilizing Pydantic models for robust data validation and serialization.

7. **Authentication**: Implementation of secure authentication mechanisms.

These features not only serve the purpose of the resume application but also act as a portfolio of FastAPI capabilities and my understanding of backend development principles.

## Getting Started

To run the backend:

1. Install dependencies: `pip install -r requirements.txt`
2. Navigate to the backend directory: `cd resume_app/backend`
3. Run the FastAPI server: `uvicorn main:app --reload`

The API will be available at `http://localhost:8000`, and you can access the interactive API documentation at `http://localhost:8000/docs`.