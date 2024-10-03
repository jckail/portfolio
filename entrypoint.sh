#!/bin/bash

# Start the backend
uvicorn resume_app.backend.main:app --host 0.0.0.0 --port 8000 &

# Start the frontend
# If API_URL is not set, default to http://localhost:8000
export API_URL=${API_URL:-http://localhost:8000}
streamlit run resume_app/frontend/streamlit_app.py --server.port 8080 --server.address 0.0.0.0