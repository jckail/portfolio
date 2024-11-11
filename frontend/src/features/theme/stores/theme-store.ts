import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'party';

interface ThemeState {
  theme: Theme;
  clickCount: number;
  lastClickTime: number;
  isToggleHidden: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  initTheme: () => void;
}

const THEME_STORAGE_KEY = 'portfolio-theme-preference';
const CLICK_THRESHOLD = 10;
const TIME_WINDOW = 5000; // 5 seconds in milliseconds
const PARTY_HIDE_DURATION = 10000; // 10 seconds in milliseconds

const getStoredTheme = (): Theme | null => {
  try {
    if (typeof window === 'undefined') return null;
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'party') ? storedTheme as Theme : null;
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
    (set, get) => ({
      theme: DEFAULT_THEME,
      clickCount: 0,
      lastClickTime: 0,
      isToggleHidden: false,
      toggleTheme: () => {
        const currentTime = Date.now();
        const { clickCount, lastClickTime, theme } = get();
        
        // Reset click count if time window has passed
        const isWithinTimeWindow = currentTime - lastClickTime < TIME_WINDOW;
        const newClickCount = isWithinTimeWindow ? clickCount + 1 : 1;
        
        // Check for party mode activation
        if (newClickCount === CLICK_THRESHOLD && isWithinTimeWindow) {
          set({ 
            theme: 'party',
            clickCount: 0,
            lastClickTime: currentTime,
            isToggleHidden: true
          });
          saveThemePreference('party');
          
          // Show toggle again after PARTY_HIDE_DURATION
          setTimeout(() => {
            set({ isToggleHidden: false });
          }, PARTY_HIDE_DURATION);
          
          return;
        }
        
        // Normal theme toggle
        const newTheme = theme === 'light' ? 'dark' : 
                        theme === 'dark' ? 'light' : 
                        'light'; // If in party mode, go back to light
        
        saveThemePreference(newTheme);
        set({ 
          theme: newTheme,
          clickCount: newClickCount,
          lastClickTime: currentTime
        }, false, 'theme/toggle');
      },
      setTheme: (theme) => {
        saveThemePreference(theme);
        set({ 
          theme, 
          clickCount: 0, 
          lastClickTime: 0,
          isToggleHidden: false 
        }, false, 'theme/set');
      },
      initTheme: () => {
        const storedTheme = getStoredTheme();
        const theme = storedTheme || DEFAULT_THEME;
        saveThemePreference(theme);
        set({ 
          theme, 
          clickCount: 0, 
          lastClickTime: 0,
          isToggleHidden: false 
        }, false, 'theme/init');
      }
    }),
    { name: 'Theme Store' }
  )
);
