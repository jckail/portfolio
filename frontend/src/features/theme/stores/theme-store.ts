import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  devtools(
    (set) => ({
      theme: 'light',
      toggleTheme: () => {
        set(
          (state) => ({
            theme: state.theme === 'light' ? 'dark' : 'light'
          }),
          false,
          'theme/toggle'
        );
      },
      setTheme: (theme) => {
        set({ theme }, false, 'theme/set');
      }
    }),
    { name: 'Theme Store' }
  )
);
