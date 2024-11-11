import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  initTheme: () => void;
}

const THEME_STORAGE_KEY = 'portfolio-theme-preference';

const getStoredTheme = (): Theme | null => {
  try {
    if (typeof window === 'undefined') return null;
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return (storedTheme === 'light' || storedTheme === 'dark') ? storedTheme : null;
  } catch (error) {
    console.error('[Theme Store] Error reading from localStorage:', error);
    return null;
  }
};

const saveThemePreference = (theme: Theme): void => {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    console.log('[Theme Store] Saved theme preference:', theme);
  } catch (error) {
    console.error('[Theme Store] Error saving theme preference:', error);
  }
};

// Always default to light theme initially
const DEFAULT_THEME: Theme = 'light';

export const useThemeStore = create<ThemeState>()(
  devtools(
    (set) => ({
      theme: DEFAULT_THEME,
      toggleTheme: () => {
        set(
          (state) => {
            const newTheme = state.theme === 'light' ? 'dark' : 'light';
            saveThemePreference(newTheme);
            return { theme: newTheme };
          },
          false,
          'theme/toggle'
        );
      },
      setTheme: (theme) => {
        saveThemePreference(theme);
        set({ theme }, false, 'theme/set');
      },
      initTheme: () => {
        const storedTheme = getStoredTheme();
        const theme = storedTheme || DEFAULT_THEME;
        saveThemePreference(theme);
        set({ theme }, false, 'theme/init');
      }
    }),
    { name: 'Theme Store' }
  )
);
