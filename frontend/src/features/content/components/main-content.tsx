import React, { useState, useMemo } from 'react';
import Header from './header';
import TechnicalSkills from './sections/skills';
import Experience from './sections/experience';
import Projects from './sections/projects';
import MyResume from './sections/my-resume';
import TLDR from './sections/tldr';
import AdminHandler from './admin-handler';
import AdminLogin from './admin-login';
import { useScrollSpy } from '../../../shared/hooks/use-scroll-spy';
import { useLoading } from '../context/loading-context';
import { useAppLogic } from '../../../app/providers/app-logic-provider';
import { useAdminStore } from '../stores/admin-store';
import '../styles/main-content.css';
import '../styles/loading.css';


const MainContentInner: React.FC = () => {
  useScrollSpy();
  const { loadingStates } = useLoading();
  const { theme, toggleTheme, isToggleHidden } = useAppLogic();
  const { isLoggedIn: isAdminLoggedIn } = useAdminStore();

  const handleResumeClick = () => {
    const resumeSection = document.getElementById('resume');
    if (resumeSection) {
      resumeSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAdminClick = () => {
    // This should be handled by the admin feature
    console.log('Admin click');
  };



  return (
    <div className="layout">
      <Header 
        theme={theme}
        toggleTheme={toggleTheme}
        handleResumeClick={handleResumeClick}
        handleAdminClick={handleAdminClick}
        isAdminLoggedIn={isAdminLoggedIn}
        isToggleHidden={isToggleHidden}
      />
      <main>
        <div className="loading-states">
          {Object.entries(loadingStates).map(([section, isLoading]) => (
            isLoading && (
              <div key={section} className="loading-item pending">
                {section}: Loading...
              </div>
            )
          ))}
        </div>
        <div className="resume">
          <TLDR />
          <Experience />
          <TechnicalSkills />
          <Projects />
          <MyResume />
        </div>
      </main>
    </div>
  );
};

const MainContent: React.FC = (props) => {
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  React.useEffect(() => {
    if (location.pathname === '/admin') {
      setIsAdminModalOpen(true);
    }
  }, [location]);

  const handleLoginSuccess = () => {
    setIsAdminModalOpen(false);
  };

  return (
    <>
      <AdminLogin 
        isOpen={isAdminModalOpen} 
        onClose={() => setIsAdminModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
      <AdminHandler />
      <MainContentInner {...props} />
    </>
  );
};

export default MainContent;
