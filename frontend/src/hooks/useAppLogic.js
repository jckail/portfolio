import { useState, useCallback, useEffect } from 'react';
import { useResumeData } from './useResumeData';
import { useTheme } from './useTheme';
import { useParticles } from './useParticles';
import { useSidebar } from './useSidebar';
import { downloadResume } from '../utils/resumeUtils';
import { useResumeFileName } from './useResumeFileName';
import { useUrlManagement } from './useUrlManagement';
import { useSectionSelection } from './useSectionSelection';
import { debounce } from 'lodash';

export const useAppLogic = () => {
  const [headerHeight, setHeaderHeight] = useState(0);
  const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');

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

  // Debounced URL update for intersection changes
  const debouncedUpdateUrl = useCallback(
    debounce((newSection) => {
      // Only skip URL update on Firefox when source is intersection
      if (!isFirefox) {
        updateUrl(newSection, false);
      }
    }, 200),
    [updateUrl, isFirefox]
  );

  // Handle section changes and URL updates
  const handleSectionChange = useCallback((newSection, source) => {
    console.log('\n--- App Section State ---');
    console.log(`Current Section: ${newSection}`);
    console.log(`Update Source: ${source}`);
    console.log('------------------------\n');
    
    if (source === 'intersection') {
      // For intersection updates, only update URL if not Firefox
      if (!isFirefox) {
        debouncedUpdateUrl(newSection);
      }
    } else {
      // For manual navigation (button/navigation), always update URL regardless of browser
      const shouldPushState = source === 'navigation' || source === 'button';
      updateUrl(newSection, shouldPushState);
    }
  }, [updateUrl, debouncedUpdateUrl, isFirefox]);

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

  // Cleanup debounced function
  useEffect(() => {
    return () => {
      debouncedUpdateUrl.cancel();
    };
  }, [debouncedUpdateUrl]);

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
