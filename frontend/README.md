# QuickResume Frontend

## Overview
The frontend of QuickResume is built with React and Vite, providing a modern, responsive interface for displaying resume information. It features a component-based architecture, real-time updates, and smooth animations.

## Key Features
- Interactive UI components
- Dark/light theme toggle
- Responsive design
- Particle.js background
- PDF resume viewer
- Real-time data synchronization

## Project Structure
```
frontend/
├── src/
│   ├── components/      # Reusable UI components
│   ├── sections/        # Main content sections
│   ├── styles/          # CSS modules and global styles
│   ├── utils/          # Utility functions
│   └── App.jsx         # Main application component
├── public/             # Static assets
└── vite.config.js      # Vite configuration
```

## Components
- `AppLogicProvider`: Manages application state and logic
- `HeaderNav`: Navigation and theme controls
- `ResumeProvider`: Handles resume data fetching and state
- `ParticlesProvider`: Manages background animation
- `SidePanel`: Collapsible sidebar navigation

## Development
1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Environment Variables
Required environment variables in `.env`:
```env
VITE_API_URL=http://localhost:8080/api
```

## Styling
- CSS modules for component-specific styles
- Global styles in `src/styles/`
- Theme variables in `src/theme.css`
- Responsive design breakpoints in `src/styles/responsive.css`

## Best Practices
- Use functional components with hooks
- Implement lazy loading for optimal performance
- Follow component-based architecture
- Maintain consistent styling patterns
