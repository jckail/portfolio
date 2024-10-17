# QuickResume Frontend

This is the frontend for the QuickResume project, a dynamic and interactive resume website.

## Project Structure

The project is organized as follows:

```
frontend/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.jsx
│   │   │   └── SidePanel.jsx
│   │   ├── sections/
│   │   │   ├── Experience.jsx
│   │   │   ├── Projects.jsx
│   │   │   ├── TechnicalSkills.jsx
│   │   │   └── MyResume.jsx
│   │   ├── items/
│   │   │   ├── JobExperience.jsx
│   │   │   └── ProjectItem.jsx
│   │   ├── MainContent.jsx
│   │   └── ParticlesBackground.jsx
│   ├── hooks/
│   │   ├── useResumeData.js
│   │   └── useScrollHandler.js
│   ├── utils/
│   │   └── helpers.js
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│   └── theme.css
├── public/
├── index.html
├── package.json
└── vite.config.js
```

## Key Components

- `App.jsx`: The main component that orchestrates the entire application.
- `MainContent.jsx`: Renders the main content of the resume.
- `ParticlesBackground.jsx`: Manages the particle animation background.
- `Header.jsx`: Displays the header with navigation and theme toggle.
- `SidePanel.jsx`: Shows a side navigation panel for easy section access.

## Custom Hooks

- `useResumeData.js`: Fetches and manages the resume data.
- `useScrollHandler.js`: Handles scroll-related functionality for section highlighting.

## Setup and Running

1. Install dependencies:
   ```
   npm install
   ```

2. Run the development server:
   ```
   npm run dev
   ```

3. Build for production:
   ```
   npm run build
   ```

## Recent Updates

- Implemented PropTypes for type checking in components.
- Refactored components for better organization and readability.
- Added custom hooks for better state management and code reusability.
- Improved file structure with separate directories for layout, sections, and item components.

## TODO

- Implement unit tests for components and hooks.
- Review and optimize CSS for better performance and maintainability.
- Consider implementing lazy loading for better initial load times.
