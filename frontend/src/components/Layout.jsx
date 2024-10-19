import React, { useRef, useEffect } from 'react'
import SandwichMenu from './SandwichMenu'
import SidePanel from './SidePanel'
import HeaderNav from './HeaderNav'
import { getApiUrl } from '../helpers/utils'

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
  scrollToSection // Add this new prop
}) {
  const headerRef = useRef(null)
  const apiUrl = getApiUrl()

  useEffect(() => {
    if (headerRef.current) {
      const height = headerRef.current.offsetHeight;
      console.log('Setting header height:', height);
      setHeaderHeight(height);
    }
  }, [setHeaderHeight])

  console.log('Layout rendering, headerHeight:', headerHeight);

  return (
    <div className="App">
      <div id="particles-js"></div>
      <div className={`content ${isSidebarOpen || isTemporarilyVisible ? 'sidebar-open' : ''}`}>
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
          scrollToSection={scrollToSection} // Pass the scrollToSection function
        />
        <main>
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
