import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppLogicProvider } from './app/providers/app-logic-provider';
import { ResumeProvider } from './features/resume/components/resume-provider';
import { ThemeProvider } from './features/theme/components/theme-provider';
import App from './app/app';
import './shared/styles/variables.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppLogicProvider>
      <ThemeProvider>
        <ResumeProvider>
          <App />
        </ResumeProvider>
      </ThemeProvider>
    </AppLogicProvider>
  </React.StrictMode>
);
