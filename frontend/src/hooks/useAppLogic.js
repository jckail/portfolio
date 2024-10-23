import { useState, useCallback } from 'react';
import { useResumeData } from './useResumeData';
import { useTheme } from './useTheme';
import { useParticles } from './useParticles';
import { useSidebar } from './useSidebar';
import { downloadResume } from '../utils/resumeUtils';
import { useResumeFileName } from './useResumeFileName';
import { useSectionSelection } from './useSectionSelection';

export const useAppLogic = () => {
  const [headerHeight, setHeaderHeight] = useState(0);

  const { resumeData, error: resumeError } = useResumeData();
  const { resumeFileName, error: fileNameError } = useResumeFileName();
  const { theme, toggleTheme, updateParticlesConfig } = useTheme();
  const { particlesLoaded } = useParticles(updateParticlesConfig);

  // Use the new section selection hook
  const {
    currentSection,
    sectionsRef,
    handleNavigationClick,
    handleButtonClick
  } = useSectionSelection(headerHeight);

  const {
    isSidebarOpen,
    isTemporarilyVisible,
    toggleSidebar
  } = useSidebar();

  const handleResumeClick = useCallback((event) => {
    event.preventDefault();
    handleButtonClick('my-resume');
    downloadResume(resumeFileName);
  }, [handleButtonClick, resumeFileName]);

  return {
    resumeData,
    error: resumeError || fileNameError,
    theme,
    currentSection,
    headerHeight,
    isSidebarOpen,
    isTemporarilyVisible,
    sectionsRef,
    particlesLoaded,
    resumeFileName,
    setHeaderHeight,
    toggleTheme,
    toggleSidebar,
    handleResumeClick,
    // Export navigation handler for use in components
    handleSectionClick: handleNavigationClick
  };
};
