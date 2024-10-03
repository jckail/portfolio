#!/bin/bash

# Start the backend
uvicorn resume_app.backend.main:app --host 0.0.0.0 --port 8000 &

# Start the frontend
# Use the API_URL environment variable, which defaults to http://localhost:8000 if not set
streamlit run resume_app/frontend/streamlit_app.py --server.port 8080 --server.address 0.0.0.0