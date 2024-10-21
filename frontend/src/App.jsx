import React from 'react';
import './App.css';
import './theme.css';
import Layout from './components/Layout';
import AppMain from './components/AppMain';
import { useAppLogic } from './hooks/useAppLogic';

function App() {
  const {
    resumeData,
    error,
    theme,
    currentSection,
    headerHeight,
    isSidebarOpen,
    isTemporarilyVisible,
    sectionsRef,
    setHeaderHeight,
    toggleTheme,
    toggleSidebar,
    handleResumeClick,
    scrollToSection,
  } = useAppLogic();

  return (
    <Layout
      resumeData={resumeData}
      error={error}
      theme={theme}
      toggleTheme={toggleTheme}
      currentSection={currentSection}
      headerHeight={headerHeight}
      setHeaderHeight={setHeaderHeight}
      isSidebarOpen={isSidebarOpen}
      isTemporarilyVisible={isTemporarilyVisible}
      toggleSidebar={toggleSidebar}
      handleResumeClick={handleResumeClick}
      scrollToSection={scrollToSection}
      sectionsRef={sectionsRef} // Pass sectionsRef to Layout
    />
  );
}

export default App;
