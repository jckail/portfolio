# Portfolio

## Overview
Portfolio is a modern, interactive resume application that transforms the traditional resume into a dynamic web experience. Built with React and FastAPI, it offers a unique way to showcase professional experience through an interactive interface with real-time data updates, smooth animations, and a responsive design that adapts to any device.

### Key Features
- Interactive UI with dark/light theme support
- Real-time data updates through FastAPI backend
- Responsive design for all devices
- PDF resume download capability
- Particle.js background animations
- Comprehensive logging system
- Professional section organization (Experience, Projects, Skills)

## Project Structure
```
portfolio/
├── frontend/    # React/Vite application
├── backend/     # FastAPI server
├── images/      # Static assets
└── scripts/     # Utility scripts
```

## Quick Start

### Prerequisites
- Python 3.6+
- Node.js 14+
- npm or yarn

### Running Locally
1. Clone the repository:
```bash
git clone [repository-url]
cd portfolio
```

2. Start both frontend and backend:
```bash
./local_test.sh
```

This script will:
- Install all necessary dependencies
- Start the FastAPI backend server
- Launch the Vite development server
- Open the application in your default browser

### Access the Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:8080
- API Documentation: http://localhost:8080/docs

## Development

### Frontend Development
The frontend is built with React and Vite, offering:
- Hot module replacement
- Fast refresh
- Component-based architecture
- Modern JavaScript features

### Backend Development
The backend uses FastAPI, providing:
- Fast API endpoints
- Automatic API documentation
- Type checking
- Asynchronous request handling

## Environment Configuration
Create a `.env` file in the root directory:
```env
FLASK_APP=backend/main.py
ALLOWED_ORIGINS=http://localhost:5173
VITE_API_URL=http://localhost:8080/api
RESUME_FILE=YourResume.pdf
```

## Additional Documentation
- [Frontend Documentation](./frontend/README.md)
- [Backend Documentation](./backend/README.md)
