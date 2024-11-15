import React, { createContext, useContext, ReactNode } from 'react';

import { ThemeProvider } from '@/features/theme/components/theme-provider';
import { ResumeProvider } from '@/features/content/components/resume-provider';
import { TelemetryProvider } from '@/features/content/components/telemetry-provider';

interface AppProviderProps {
  children: ReactNode;
}

const AppContext = createContext<null>(null);

export function AppProvider({ children }: AppProviderProps) {
  return (
    <AppContext.Provider value={null}>
      <ThemeProvider>
        <ResumeProvider>
          <TelemetryProvider>
            {children}
          </TelemetryProvider>
        </ResumeProvider>
      </ThemeProvider>
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
