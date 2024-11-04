import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  initTheme: () => void;
}

const getThemeFromUrl = (): Theme => {
  if (typeof window === 'undefined') return 'light';
  const params = new URLSearchParams(window.location.search);
  const themeParam = params.get('theme');
  return themeParam === 'dark' ? 'dark' : 'light';
};

const updateUrlTheme = (theme: Theme) => {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set('theme', theme);
  window.history.replaceState({}, '', url.toString());
};

const initialTheme = getThemeFromUrl();

export const useThemeStore = create<ThemeState>()(
  devtools(
    (set) => {
      // Listen for URL changes (browser back/forward)
      if (typeof window !== 'undefined') {
        window.addEventListener('popstate', () => {
          const theme = getThemeFromUrl();
          set({ theme }, false, 'theme/url-change');
        });
      }

      return {
        theme: initialTheme,
        toggleTheme: () => {
          set(
            (state) => {
              const newTheme = state.theme === 'light' ? 'dark' : 'light';
              updateUrlTheme(newTheme);
              return { theme: newTheme };
            },
            false,
            'theme/toggle'
          );
        },
        setTheme: (theme) => {
          updateUrlTheme(theme);
          set({ theme }, false, 'theme/set');
        },
        initTheme: () => {
          const theme = getThemeFromUrl();
          updateUrlTheme(theme);
          set({ theme }, false, 'theme/init');
        }
      };
    },
    { name: 'Theme Store' }
  )
);
