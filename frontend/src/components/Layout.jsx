import React, { useRef, useEffect } from 'react'
import SandwichMenu from './SandwichMenu'
import SidePanel from './SidePanel'
import HeaderNav from './HeaderNav'
import BrowserBanner from './BrowserBanner'
import { getApiUrl } from '../utils/apiUtils'

function Layout({ 
  children, 
  resumeData, 
  theme, 
  toggleTheme, 
  currentSection, 
  headerHeight, 
  setHeaderHeight,
  isSidebarOpen, 
  isTemporarilyVisible, 
  toggleSidebar, 
  handleResumeClick,
  handleSectionClick
}) {
  const headerRef = useRef(null)
  const apiUrl = getApiUrl()
  const previousHeightRef = useRef(headerHeight)

  useEffect(() => {
    if (headerRef.current) {
      const newHeight = headerRef.current.offsetHeight;
      // Only update if the height has actually changed
      if (newHeight !== previousHeightRef.current) {
        previousHeightRef.current = newHeight;
        setHeaderHeight(newHeight);
      }
    }
  }, [
    // Dependencies that could affect header height
    resumeData?.name,
    resumeData?.title,
    isSidebarOpen,
    isTemporarilyVisible
  ])

  const wrapperStyle = {
    overflowX: 'hidden',
    position: 'relative',
    width: '100%',
    maxWidth: '100vw'
  };

  const contentStyle = {
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    padding: '0 15px'
  };

  return (
    <div className="App" style={wrapperStyle}>
      <BrowserBanner />
      <div id="particles-js"></div>
      <div className={`content ${isSidebarOpen || isTemporarilyVisible ? 'sidebar-open' : ''}`} style={contentStyle}>
        <header className="floating-header" ref={headerRef}>
          <div className="header-left">
            <SandwichMenu onClick={toggleSidebar} />
            <div className="name-title">
              <h1>{resumeData?.name || 'Missing Name'}</h1>
              <h2>{resumeData?.title || 'Missing Title'}</h2>
            </div>
          </div>
          <div className="header-right">
            <HeaderNav resumeData={resumeData} theme={theme} onResumeClick={handleResumeClick} />
            <button onClick={toggleTheme} className="theme-toggle">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </header>
        <SidePanel 
          isOpen={isSidebarOpen} 
          currentSection={currentSection} 
          headerHeight={headerHeight} 
          onClose={toggleSidebar}
          isTemporarilyVisible={isTemporarilyVisible}
          handleSectionClick={handleSectionClick}
        />
        <main style={{ width: '100%', maxWidth: '100%' }}>
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
