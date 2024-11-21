import React, { createContext, useContext, ReactNode } from 'react';
import { ThemeProvider } from './providers/theme-provider';
import { TelemetryProvider } from './providers/telemetry-provider';

interface AppProviderProps {
  children: ReactNode;
}

const AppContext = createContext<null>(null);

export function AppProvider({ children }: AppProviderProps) {
  return (
    <AppContext.Provider value={null}>
      <ThemeProvider>
          <TelemetryProvider>
            {children}
          </TelemetryProvider>
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
