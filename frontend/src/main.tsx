import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppLogicProvider } from './app/providers/app-logic-provider';
import { ResumeProvider } from './features/resume/components/resume-provider';
import { ThemeProvider } from './features/theme/components/theme-provider';
import { TelemetryProvider } from './features/telemetry/components/telemetry-provider';
import App from './app/app';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppLogicProvider>
        <ThemeProvider>
          <ResumeProvider>
            <TelemetryProvider>
              <App />
            </TelemetryProvider>
          </ResumeProvider>
        </ThemeProvider>
      </AppLogicProvider>
    </BrowserRouter>
  </React.StrictMode>
);
