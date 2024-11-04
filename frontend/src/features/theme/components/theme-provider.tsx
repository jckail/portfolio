import React from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useThemeStore } from '../stores/theme-store';
import createAppTheme from '../config/mui-theme';
import { ParticlesProvider } from './particles-provider';
import { particlesConfig } from '../lib/particles/config';
import type { ParticlesConfig } from '../lib/particles/types';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const theme = useThemeStore(state => state.theme);
  const muiTheme = React.useMemo(() => createAppTheme(theme), [theme]);

  const updateParticlesConfig = React.useCallback((): ParticlesConfig => {
    return particlesConfig[theme];
  }, [theme]);

  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      <ParticlesProvider updateParticlesConfig={updateParticlesConfig}>
        {children}
      </ParticlesProvider>
    </MuiThemeProvider>
  );
};
