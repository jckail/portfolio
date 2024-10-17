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
│   ├── main.py
│   ├── resume_data.py
│   └── assets/
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
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

4. Create a `.env` file in the root directory and add the following:
   ```
   VITE_API_URL=http://localhost:8000
   ```

## Running the Application
1. Start the backend server:
   ```
   python backend/main.py
   ```

2. In a new terminal, start the frontend development server:
   ```
   cd frontend
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:3000` (or the port specified by Vite).

## Technologies Used
- Frontend: React, Vite, CSS
- Backend: FastAPI
- Other: Particles.js for background animation

Feel free to customize this README to better fit your specific project needs and add any additional sections or information you find relevant.
