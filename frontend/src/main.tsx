import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ResumeProvider } from './components/ResumeProvider';
import { AppLogicProvider } from './components/AppLogicProvider';

// Import base styles first
import './styles/variables.css';
import './App.css';

// Import component styles
import './styles/header.css';
import './styles/technical-skills.css';
import './styles/experience.css';
import './styles/projects.css';
import './styles/my-resume.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppLogicProvider>
      <ResumeProvider>
        <App />
      </ResumeProvider>
    </AppLogicProvider>
  </React.StrictMode>
);
