export type Theme = 'light' | 'dark' | 'party';

export interface ThemeState {
  theme: Theme;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
}

export interface ThemeConfig {
  defaultTheme: Theme;
  particles: {
    dark: ParticleConfig;
    light: ParticleConfig;
  };
}

export interface ThemePreferences {
  theme: Theme;
  useSystemTheme: boolean;
  autoSwitchTime?: {
    darkStart: string; // HH:mm format
    darkEnd: string; // HH:mm format
  };
}

export interface ParticleConfig {
  background_color: string;
  particle_color: string;
  line_color: string;
}
