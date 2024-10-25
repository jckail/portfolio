import React, { useEffect, useState } from 'react';
import './App.css';
import './theme.css';
import SandwichMenu from './components/SandwichMenu';
import SidePanel from './components/SidePanel';
import HeaderNav from './components/HeaderNav';
import TelemetryBanner from './telemetry/TelemetryBanner';
import AboutMe from './sections/AboutMe';
import TechnicalSkills from './sections/TechnicalSkills';
import Experience from './sections/Experience';
import Projects from './sections/Projects';
import MyResume from './sections/MyResume';
import AdminLogin from './components/AdminLogin';
import { ResumeProvider, useResume } from './components/ResumeProvider';
import { AppLogicProvider, useAppLogic } from './components/AppLogicProvider';
import { ParticlesProvider } from './components/ParticlesProvider';
import { SidebarProvider, useSidebar } from './components/SidebarProvider';
import { API_CONFIG } from './configs';

function AppContent() {
  const {
    theme,
    currentSection,
    setSectionRef,
    toggleTheme,
    handleSectionClick,
    handleButtonClick,
    updateParticlesConfig
  } = useAppLogic();

  const {
    isSidebarOpen,
    isTemporarilyVisible,
    toggleSidebar
  } = useSidebar();

  const {
    resumeData,
    error,
    handleDownload
  } = useResume();

  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  const verifyToken = async (token) => {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.admin.verify}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Token verification failed');
      }

      const data = await response.json();
      return true;
    } catch (err) {
      console.error('Token verification failed:', err);
      localStorage.removeItem('adminToken');
      return false;
    }
  };

  useEffect(() => {
    const checkExistingToken = async () => {
      const token = localStorage.getItem('adminToken');
      if (token) {
        const isValid = await verifyToken(token);
        setIsAdminLoggedIn(isValid);
      }
    };
    checkExistingToken();
  }, []);

  const handleResumeClick = (event) => {
    event.preventDefault();
    handleButtonClick('my-resume');
    handleDownload();
  };

  useEffect(() => {
    if (!resumeData) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.id;
            if (sectionId) {
              window.history.replaceState(null, '', `#${sectionId}`);
              console.log('Updated URL for section:', sectionId);
            }
          }
        });
      },
      {
        threshold: 0.5,
        rootMargin: '-50px 0px -50px 0px'
      }
    );

    const sections = document.querySelectorAll('section[id]');
    console.log('Found sections:', sections.length);
    
    sections.forEach((section) => {
      observer.observe(section);
      console.log('Observing section:', section.id);
    });

    return () => {
      sections.forEach(section => observer.unobserve(section));
      observer.disconnect();
    };
  }, [resumeData]);

  const handleAdminClick = async () => {
    if (isAdminLoggedIn) {
      try {
        const token = localStorage.getItem('adminToken');
        await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.admin.logout}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (err) {
        console.error('Logout error:', err);
      }
      localStorage.removeItem('adminToken');
      setIsAdminLoggedIn(false);
    } else {
      setIsAdminLoginOpen(true);
    }
  };

  const handleLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    setIsAdminLoginOpen(false);
  };

  return (
    <ParticlesProvider updateParticlesConfig={updateParticlesConfig}>
      <div className="App app-wrapper">
        <TelemetryBanner isAdminLoggedIn={isAdminLoggedIn} />
        <div id="particles-js"></div>
        <div className={`app-content ${isSidebarOpen || isTemporarilyVisible ? 'sidebar-open' : ''}`}>
          <header className="floating-header">
            <div className="header-left">
              <SandwichMenu onClick={toggleSidebar} />
              <div className="name-title">
                <h1>{resumeData?.name || 'Loading...'}</h1>
                <h2>{resumeData?.title || ''}</h2>
              </div>
            </div>
            <div className="header-right">
              <HeaderNav 
                theme={theme} 
                onResumeClick={handleResumeClick}
                onAdminClick={handleAdminClick}
                isAdminLoggedIn={isAdminLoggedIn}
              />
              <button onClick={toggleTheme} className="theme-toggle">
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
            </div>
          </header>
          <SidePanel 
            isOpen={isSidebarOpen} 
            currentSection={currentSection} 
            onClose={toggleSidebar}
            isTemporarilyVisible={isTemporarilyVisible}
            handleSectionClick={handleSectionClick}
          />
          <main>
            {error && (
              <div className="error-message">
                <p>Error: {error}</p>
              </div>
            )}
            {!resumeData && !error && <div className="loading">Loading resume data...</div>}
            {resumeData && (
              <>
                <AboutMe aboutMe={resumeData.aboutMe} ref={el => setSectionRef('about-me', el)} />
                <TechnicalSkills skills={resumeData.technicalSkills} ref={el => setSectionRef('technical-skills', el)} />
                <Experience experience={resumeData.experience} ref={el => setSectionRef('experience', el)} />
                <Projects projects={resumeData.projects} ref={el => setSectionRef('projects', el)} />
                <MyResume ref={el => setSectionRef('my-resume', el)} />
              </>
            )}
          </main>
          <AdminLogin 
            isOpen={isAdminLoginOpen} 
            onClose={() => setIsAdminLoginOpen(false)}
            onLoginSuccess={handleLoginSuccess}
          />
        </div>
      </div>
    </ParticlesProvider>
  );
}

function App() {
  return (
    <AppLogicProvider>
      <SidebarProvider>
        <ResumeProvider>
          <AppContent />
        </ResumeProvider>
      </SidebarProvider>
    </AppLogicProvider>
  );
}

export default App;
