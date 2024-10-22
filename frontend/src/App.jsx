import React from 'react'
import ReactGA from 'react-ga4'
import './App.css'
import './theme.css'
import Layout from './components/Layout'
import AppMain from './components/AppMain'
import { useAppLogic } from './hooks/useAppLogic'

const TRACKING_ID = "G-HDKC74P3BD"
ReactGA.initialize(TRACKING_ID)

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
    ReactGA.send({ hitType: "pageview", page: window.location.pathname + window.location.search, title: "Resume" });
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
