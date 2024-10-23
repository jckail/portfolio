import { useState, useCallback, useEffect } from 'react';
import { useResumeData } from './useResumeData';
import { useTheme } from './useTheme';
import { useParticles } from './useParticles';
import { useSidebar } from './useSidebar';
import { downloadResume } from '../utils/resumeUtils';
import { useResumeFileName } from './useResumeFileName';
import { useUrlManagement } from './useUrlManagement';
import { useSectionSelection } from './useSectionSelection';

export const useAppLogic = () => {
  const [headerHeight, setHeaderHeight] = useState(0);

  // Log header height changes
  useEffect(() => {
    console.log('\n--- Header Height Update ---');
    console.log(`New Header Height: ${headerHeight}px`);
    console.log('------------------------\n');
  }, [headerHeight]);

  const { resumeData, error: resumeError } = useResumeData();
  const { resumeFileName, error: fileNameError } = useResumeFileName();
  const { theme, toggleTheme, updateParticlesConfig } = useTheme();
  const { particlesLoaded } = useParticles(updateParticlesConfig);
  const { updateUrl } = useUrlManagement();

  // Handle section changes and URL updates
  const handleSectionChange = useCallback((newSection, source) => {
    console.log('\n--- App Section State ---');
    console.log(`Current Section: ${newSection}`);
    console.log(`Update Source: ${source}`);
    console.log('------------------------\n');
    
    // Update URL - push state for user actions, replace for scroll/intersection
    const shouldPushState = source === 'navigation' || source === 'button';
    updateUrl(newSection, shouldPushState);
  }, [updateUrl]);

  // Use the section selection hook with URL management and header height
  const {
    currentSection,
    sectionsRef,
    handleNavigationClick,
    handleButtonClick
  } = useSectionSelection(headerHeight, handleSectionChange);

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

  // Handle header height updates
  const handleHeaderHeightChange = useCallback((height) => {
    if (height !== headerHeight) {
      setHeaderHeight(height);
    }
  }, [headerHeight]);

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
    setHeaderHeight: handleHeaderHeightChange,
    toggleTheme,
    toggleSidebar,
    handleResumeClick,
    handleSectionClick: handleNavigationClick
  };
};
