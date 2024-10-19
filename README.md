# Quick Resume

## Project Overview
Quick Resume is a dynamic, interactive resume application that showcases professional experience, skills, and projects in a visually appealing manner. It features a responsive design with a dark/light theme toggle and smooth scrolling navigation.

## Project Structure
The project is organized into frontend and backend directories:

```
quickResume/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── helpers/
│   │   ├── sections/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── configs.js
│   │   ├── main.jsx
│   │   ├── particlesConfig.js
│   │   └── theme.css
│   ├── public/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes.py
│   │   ├── core/
│   │   │   └── __init__.py
│   │   ├── models/
│   │   │   └── resume_data.py
│   │   └── main.py
│   └── assets/
├── images/
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── entrypoint.sh
├── requirements.txt
├── .env
└── README.md
```

## Setup Instructions
1. Clone the repository:
   ```
   git clone https://github.com/your-username/quickResume.git
   cd quickResume
   ```

2. Set up the backend:
   ```
   pip install -r requirements.txt
   ```

3. Set up the frontend:
   ```
   cd frontend
   npm install
   ```

4. Create a `.env` file in the root directory with the following content:
   ```
   # Backend
   FLASK_APP=backend/main.py
   ALLOWED_ORIGINS=http://localhost:5173,http://192.168.0.122:5173,http://localhost:8080,http://0.0.0.0:8080,http://localhost:5173,https://quickresume-292025398859.us-central1.run.app

   # Frontend
   VITE_API_URL=http://localhost:8080/api

   # Shared
   PRODUCTION_URL=https://quickresume-292025398859.us-central1.run.app

   # Resume file name
   RESUME_FILE=JordanKailResume.pdf
   VITE_RESUME_FILE=JordanKailResume.pdf
   ```

   Note: This single .env file is used for both frontend and backend configurations.

## Running the Application
You can now run both the backend and frontend simultaneously using the entrypoint.sh script:

1. Make sure the script is executable:
   ```
   chmod +x entrypoint.sh
   ```

2. Run the application:
   ```
   ./entrypoint.sh
   ```

This script starts both the backend (with hot reloading enabled) and the frontend development server.

3. Open your browser and navigate to `http://localhost:5173` (or the port specified by Vite).

Note: Hot reloading is enabled for both the backend and frontend. Any changes you make to the code will automatically trigger a reload of the affected parts of the application.

## Technologies Used
- Frontend: React, Vite, CSS
- Backend: FastAPI
- Other: Particles.js for background animation

## API Endpoints
- GET `/`: Welcome message
- GET `/api/resume_data`: Get formatted resume data
- GET `/api/download_resume`: Download resume PDF
- GET `/api/resume`: View resume PDF
- GET `/api/images/*`: Serve static images

Feel free to customize this README to better fit your specific project needs and add any additional sections or information you find relevant.
