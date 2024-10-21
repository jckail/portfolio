import { useState, useCallback } from 'react';
import { useResumeData } from './useResumeData';
import { useTheme } from './useTheme';
import { useParticles } from './useParticles';
import { useScrollNavigation } from './useScrollNavigation';
import { useSidebar } from './useSidebar';
import { downloadResume } from '../helpers/utils';

export const useAppLogic = () => {
  const [headerHeight, setHeaderHeight] = useState(0);

  // Fetch resume data
  const { resumeData, error } = useResumeData();

  // Handle theme toggling
  const { theme, toggleTheme, updateParticlesConfig } = useTheme();

  // Initialize particles effect
  const { particlesLoaded } = useParticles(updateParticlesConfig);

  // Handle scroll navigation
  const { currentSection, sectionsRef, scrollToSection } = useScrollNavigation(
    resumeData,
    headerHeight
  );

  // Handle sidebar state
  const {
    isSidebarOpen,
    isTemporarilyVisible,
    toggleSidebar,
  } = useSidebar();

  // Handle resume click
  const handleResumeClick = useCallback(
    (event) => {
      event.preventDefault();
      scrollToSection('my-resume');
      // If you want to download the resume upon clicking, uncomment the line below
      downloadResume();
    },
    [scrollToSection]
  );

  return {
    resumeData,
    error,
    theme,
    currentSection,
    headerHeight,
    isSidebarOpen,
    isTemporarilyVisible,
    sectionsRef,
    particlesLoaded,
    setHeaderHeight,
    toggleTheme,
    toggleSidebar,
    handleResumeClick,
    scrollToSection,
  };
};
