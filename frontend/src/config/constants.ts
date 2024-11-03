// Theme constants
export const THEME = {
  LIGHT: 'light',
  DARK: 'dark',
} as const;

// API endpoints
export const API_ENDPOINTS = {
  RESUME: '/resume',
  ADMIN: {
    LOGIN: '/admin/login',
    LOGOUT: '/admin/logout',
  },
  TELEMETRY: '/telemetry',
} as const;

// Media queries
export const BREAKPOINTS = {
  MOBILE: '320px',
  TABLET: '768px',
  DESKTOP: '1024px',
  WIDE: '1280px',
} as const;

export const MEDIA_QUERIES = {
  MOBILE: `(min-width: ${BREAKPOINTS.MOBILE})`,
  TABLET: `(min-width: ${BREAKPOINTS.TABLET})`,
  DESKTOP: `(min-width: ${BREAKPOINTS.DESKTOP})`,
  WIDE: `(min-width: ${BREAKPOINTS.WIDE})`,
} as const;

// Animation durations
export const ANIMATION = {
  FAST: '0.2s',
  NORMAL: '0.3s',
  SLOW: '0.5s',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  THEME: 'theme',
  ADMIN_TOKEN: 'admin_token',
} as const;

// Error messages
export const ERROR_MESSAGES = {
  GENERIC: 'An error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'Unauthorized access. Please log in.',
} as const;

// Usage example:
// import { THEME, BREAKPOINTS, MEDIA_QUERIES } from '@/config/constants';
