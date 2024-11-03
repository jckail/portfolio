import React, { createContext, useContext } from 'react';
import { useThemeStore, Theme } from '@/features/theme/stores/theme-store';

interface AppLogicContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const AppLogicContext = createContext<AppLogicContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

export const useAppLogic = () => useContext(AppLogicContext);

interface AppLogicProviderProps {
  children: React.ReactNode;
}

export const AppLogicProvider: React.FC<AppLogicProviderProps> = ({ children }) => {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <AppLogicContext.Provider
      value={{
        theme,
        toggleTheme,
      }}
    >
      {children}
    </AppLogicContext.Provider>
  );
};

export default AppLogicProvider;
