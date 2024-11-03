// Environment variables
export const env = {
  apiUrl: import.meta.env.VITE_API_URL,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  resumeFile: import.meta.env.VITE_RESUME_FILE,
  productionUrl: import.meta.env.PRODUCTION_URL,
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  mode: import.meta.env.MODE,
} as const;

// Application configuration
export const config = {
  app: {
    name: 'Quick Resume',
    version: '1.0.0',
    description: 'A modern resume website',
  },
  api: {
    baseUrl: env.apiUrl,
    endpoints: {
      resume: '/api/resume',
      admin: {
        login: '/api/admin/login',
        logout: '/api/admin/logout',
      },
      telemetry: '/api/telemetry',
    },
  },
  theme: {
    defaultTheme: 'dark' as const,
    particles: {
      dark: {
        background_color: '#000000',
        particle_color: '#ffffff',
        line_color: '#ffffff',
      },
      light: {
        background_color: '#ffffff',
        particle_color: '#000000',
        line_color: '#000000',
      },
    },
  },
  telemetry: {
    enabled: true,
    logRetentionDays: 7,
    sampleRate: 0.1, // 10% of users
  },
  features: {
    adminPanel: true,
    telemetry: true,
    particles: true,
  },
} as const;

// Type for the entire config object
export type Config = typeof config;

// Export constants
export * from './constants';
