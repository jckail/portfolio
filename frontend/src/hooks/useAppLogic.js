import { useState } from 'react';
import { useResumeData } from './useResumeData';
import { useTheme } from './useTheme';
import { useParticles } from './useParticles';
import { useScrollNavigation } from './useScrollNavigation';
import { useSidebar } from './useSidebar';
import { downloadResume } from '../helpers/utils';

export const useAppLogic = () => {
  const [headerHeight, setHeaderHeight] = useState(0);
  const { resumeData, error } = useResumeData();
  const { theme, toggleTheme, updateParticlesConfig } = useTheme();
  const { particlesLoaded } = useParticles(updateParticlesConfig);
  const { currentSection, sectionsRef, scrollToSection } = useScrollNavigation(resumeData, headerHeight);
  const {
    isSidebarOpen,
    isTemporarilyVisible,
    toggleSidebar
  } = useSidebar();

  const handleResumeClick = (event) => {
    event.preventDefault();
    scrollToSection('my-resume', headerHeight);
    downloadResume();
  };

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
    scrollToSection
  };
};
