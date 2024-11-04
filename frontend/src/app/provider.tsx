import React from 'react';

import { BrowserRouter } from 'react-router-dom';

import { AppLogicProvider } from './providers/app-logic-provider';
import { ResumeProvider } from '../features/resume/components/resume-provider';
import { TelemetryProvider } from '../features/telemetry/components/telemetry-provider';
import { ThemeProvider } from '../features/theme/components/theme-provider';

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  return (
    <AppLogicProvider>
      <ThemeProvider>
        <ResumeProvider>
          <TelemetryProvider>
            <BrowserRouter>
              {children}
            </BrowserRouter>
          </TelemetryProvider>
        </ResumeProvider>
      </ThemeProvider>
    </AppLogicProvider>
  );
};
