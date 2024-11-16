import React, { createContext, useContext } from 'react';
import { useThemeStore } from '../../shared/stores/theme-store';
import { Theme } from '../../types/theme';

interface AppLogicContextType {
  theme: Theme;
  toggleTheme: () => void;
  isToggleHidden: boolean;
}

const AppLogicContext = createContext<AppLogicContextType>({
  theme: 'light',
  toggleTheme: () => {},
  isToggleHidden: false,
});

export const useAppLogic = () => useContext(AppLogicContext);

interface AppLogicProviderProps {
  children: React.ReactNode;
}

export const AppLogicProvider: React.FC<AppLogicProviderProps> = ({ children }) => {
  const { theme, toggleTheme, isToggleHidden } = useThemeStore();

  return (
    <AppLogicContext.Provider
      value={{
        theme,
        toggleTheme,
        isToggleHidden,
      }}
    >
      {children}
    </AppLogicContext.Provider>
  );
};

export default AppLogicProvider;
