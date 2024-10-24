import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useSectionSelection } from '../hooks/useSectionSelection';
import { useUrl } from './UrlProvider';
import { debounce } from 'lodash';

const AppLogicContext = createContext();

export const useAppLogic = () => {
  const context = useContext(AppLogicContext);
  if (!context) {
    throw new Error('useAppLogic must be used within an AppLogicProvider');
  }
  return context;
};

export function AppLogicProvider({ children }) {
  const [headerHeight, setHeaderHeight] = useState(0);
  const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');

  useEffect(() => {
    console.log('\n--- Header Height Update ---');
    console.log(`New Header Height: ${headerHeight}px`);
    console.log('------------------------\n');
  }, [headerHeight]);

  const { theme, toggleTheme, updateParticlesConfig } = useTheme();
  const { updateUrl } = useUrl();

  const debouncedUpdateUrl = useCallback(
    debounce((newSection) => {
      if (!isFirefox) {
        updateUrl(newSection, false);
      }
    }, 200),
    [updateUrl, isFirefox]
  );

  const handleSectionChange = useCallback((newSection, source) => {
    console.log('\n--- App Section State ---');
    console.log(`Current Section: ${newSection}`);
    console.log(`Update Source: ${source}`);
    console.log('------------------------\n');
    
    if (source === 'intersection') {
      if (!isFirefox) {
        debouncedUpdateUrl(newSection);
      }
    } else {
      const shouldPushState = source === 'navigation' || source === 'button';
      updateUrl(newSection, shouldPushState);
    }
  }, [updateUrl, debouncedUpdateUrl, isFirefox]);

  const {
    currentSection,
    sectionsRef,
    handleNavigationClick,
    handleButtonClick
  } = useSectionSelection(headerHeight, handleSectionChange);

  const handleHeaderHeightChange = useCallback((height) => {
    if (height !== headerHeight) {
      setHeaderHeight(height);
    }
  }, [headerHeight]);

  useEffect(() => {
    return () => {
      debouncedUpdateUrl.cancel();
    };
  }, [debouncedUpdateUrl]);

  const value = {
    theme,
    currentSection,
    headerHeight,
    sectionsRef,
    setHeaderHeight: handleHeaderHeightChange,
    toggleTheme,
    handleSectionClick: handleNavigationClick,
    handleButtonClick,
    updateParticlesConfig
  };

  return (
    <AppLogicContext.Provider value={value}>
      {children}
    </AppLogicContext.Provider>
  );
}
