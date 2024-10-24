import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { particleConfig } from '../configs';
import getParticlesConfig from '../particlesConfig';

const AppLogicContext = createContext();

export const useAppLogic = () => {
  const context = useContext(AppLogicContext);
  if (!context) {
    throw new Error('useAppLogic must be used within an AppLogicProvider');
  }
  return context;
};

export function AppLogicProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  const [currentSection, setCurrentSection] = useState('about-me');
  const sectionsRef = useRef({});

  // Apply theme to the document body
  useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark-theme' : '';
  }, [theme]);

  // Toggle between light and dark themes
  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  // Generate particle configuration based on the current theme
  const updateParticlesConfig = useCallback(() => {
    const config = particleConfig[theme];
    return getParticlesConfig(
      config.background_color,
      config.particle_color,
      config.line_color
    );
  }, [theme]);

  // Helper function to safely set section refs
  const setSectionRef = useCallback((sectionId, element) => {
    if (element) {
      sectionsRef.current[sectionId] = element;
    }
  }, []);

  // Handle section click for navigation
  const handleSectionClick = useCallback((sectionId) => {
    setCurrentSection(sectionId);
    const element = sectionsRef.current[sectionId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Handle button click (used for resume download)
  const handleButtonClick = useCallback((sectionId) => {
    setCurrentSection(sectionId);
  }, []);

  const value = {
    theme,
    currentSection,
    sectionsRef,
    setSectionRef,
    toggleTheme,
    handleSectionClick,
    handleButtonClick,
    updateParticlesConfig,
  };

  return (
    <AppLogicContext.Provider value={value}>
      {children}
    </AppLogicContext.Provider>
  );
}
