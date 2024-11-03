import React, { createContext, useContext, useState } from 'react';
import { useThemeStore, Theme } from '../features/theme/stores/theme-store';

interface AppLogicContextType {
  theme: Theme;
  toggleTheme: () => void;
  isAdminLoggedIn: boolean;
  setIsAdminLoggedIn: (status: boolean) => void;
}

const AppLogicContext = createContext<AppLogicContextType>({
  theme: 'light',
  toggleTheme: () => {},
  isAdminLoggedIn: false,
  setIsAdminLoggedIn: () => {},
});

export const useAppLogic = () => useContext(AppLogicContext);

interface AppLogicProviderProps {
  children: React.ReactNode;
}

export const AppLogicProvider: React.FC<AppLogicProviderProps> = ({ children }) => {
  const { theme, toggleTheme } = useThemeStore();
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  return (
    <AppLogicContext.Provider
      value={{
        theme,
        toggleTheme,
        isAdminLoggedIn,
        setIsAdminLoggedIn,
      }}
    >
      {children}
    </AppLogicContext.Provider>
  );
};

export default AppLogicProvider;
