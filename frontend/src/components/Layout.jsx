import React, { useRef, useEffect } from 'react';
import SandwichMenu from './SandwichMenu';
import SidePanel from './SidePanel';
import HeaderNav from './HeaderNav';
import AppMain from './AppMain';
import { getApiUrl } from '../helpers/utils';

function Layout({
  children,
  resumeData,
  error,
  theme,
  toggleTheme,
  currentSection,
  headerHeight,
  setHeaderHeight,
  isSidebarOpen,
  isTemporarilyVisible,
  toggleSidebar,
  handleResumeClick,
  scrollToSection,
  sectionsRef, // Receive sectionsRef
}) {
  const headerRef = useRef(null);
  const apiUrl = getApiUrl();

  useEffect(() => {
    if (headerRef.current) {
      const height = headerRef.current.offsetHeight;
      console.log('Setting header height:', height);
      setHeaderHeight(height);
      document.documentElement.style.setProperty('--header-height', `${height}px`);
    }
  }, [setHeaderHeight]);

  console.log('Layout rendering, headerHeight:', headerHeight);

  const wrapperStyle = {
    overflowX: 'hidden',
    position: 'relative',
    width: '100%',
    maxWidth: '100vw',
  };

  const contentStyle = {
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    padding: '0 15px',
  };

  return (
    <div className="App" style={{ ...wrapperStyle, '--header-height': `${headerHeight}px` }}>
      <div id="particles-js"></div>
      <div
        className={`content ${isSidebarOpen || isTemporarilyVisible ? 'sidebar-open' : ''}`}
        style={contentStyle}
      >
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
          scrollToSection={scrollToSection}
        />
        <main style={{ width: '100%', maxWidth: '100%' }}>
          {/* Pass sectionsRef to AppMain */}
          <AppMain resumeData={resumeData} error={error} sectionsRef={sectionsRef} />
        </main>
      </div>
    </div>
  );
}

export default Layout;
