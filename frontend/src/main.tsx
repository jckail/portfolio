import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppLogicProvider } from './app/providers/app-logic-provider';
import { ResumeProvider } from './app/providers/resume-provider';
import { ThemeProvider } from './app/providers/theme-provider';
import App from './app/app';
import './shared/styles/variables.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppLogicProvider>
        <ThemeProvider>
          <ResumeProvider>
            <App />
          </ResumeProvider>
        </ThemeProvider>
      </AppLogicProvider>
    </BrowserRouter>
  </React.StrictMode>
);
