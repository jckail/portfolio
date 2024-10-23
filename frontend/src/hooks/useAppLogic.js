import { useState, useCallback } from 'react';
import { useResumeData } from './useResumeData';
import { useTheme } from './useTheme';
import { useParticles } from './useParticles';
import { useScrollNavigation } from './useScrollNavigation';
import { useSidebar } from './useSidebar';
import { downloadResume } from '../utils/resumeUtils';
import { useResumeFileName } from './useResumeFileName';

export const useAppLogic = () => {
  const [headerHeight, setHeaderHeight] = useState(0);

  const { resumeData, error: resumeError } = useResumeData();
  const { resumeFileName, error: fileNameError } = useResumeFileName();
  const { theme, toggleTheme, updateParticlesConfig } = useTheme();
  const { particlesLoaded } = useParticles(updateParticlesConfig);
  const { currentSection, sectionsRef, scrollToSection } = useScrollNavigation(resumeData, headerHeight);
  const {
    isSidebarOpen,
    isTemporarilyVisible,
    toggleSidebar
  } = useSidebar();

  const handleResumeClick = useCallback((event) => {
    event.preventDefault();
    scrollToSection('my-resume', headerHeight);
    downloadResume(resumeFileName);
  }, [scrollToSection, headerHeight, resumeFileName]);

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
    scrollToSection
  };
};
