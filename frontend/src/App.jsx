import React from 'react'
import ReactGA from 'react-ga'
import './App.css'
import './theme.css'
import Layout from './components/Layout'
import AppMain from './components/AppMain'
import { useAppLogic } from './hooks/useAppLogic'

ReactGA.initialize('G-HDKC74P3BD')

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
    scrollToSection
  } = useAppLogic()

  const trackResumeButtonClick = () => {
    ReactGA.event({
      category: 'User',
      action: 'Clicked See My Resume Button',
    })
  }

  React.useEffect(() => {
    ReactGA.pageview(window.location.pathname + window.location.search)
  }, [])

  return (
    <Layout
      resumeData={resumeData}
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
    >
      <AppMain 
        resumeData={resumeData}
        error={error}
        sectionsRef={sectionsRef}
        trackResumeButtonClick={trackResumeButtonClick}
      />
    </Layout>
  )
}

export default App
