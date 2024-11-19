import React, { useState, useEffect, Suspense } from 'react';
import { Header } from '../../../shared/components/header';
import TLDR from '../sections/tldr';  // Keep TLDR eager loaded as it's above the fold
import { useScrollSpy } from '../../../shared/hooks/use-scroll-spy';
import { useLoading } from '../../../shared/context/loading-context';
import { useAppLogic } from '../../providers/app-logic-provider';
import { useAdminStore } from '../../../shared/stores/admin-store';
import '../../../styles/components/layout/main-content.css';
import '../../../styles/components/layout/loading.css';

// Lazy load components below the fold
const TechnicalSkills = React.lazy(() => import('../sections/skills'));
const Experience = React.lazy(() => import('../sections/experience'));
const Projects = React.lazy(() => import('../sections/projects'));
const MyResume = React.lazy(() => import('../sections/my-resume'));
const AdminHandler = React.lazy(() => import('../admin/admin-handler'));
const AdminLogin = React.lazy(() => import('../admin/admin-login'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="section-loading">
    <div className="loading-spinner"></div>
  </div>
);

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
    console.log('Admin click');
  };

  return (
    <div className="main">
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
        <div className="main-content">
          <TLDR />
          <Suspense fallback={<LoadingFallback />}>
            <Experience />
            <TechnicalSkills />
            <Projects />
            <MyResume />
          </Suspense>
        </div>
      </main>
    </div>
  );
};

const MainContent: React.FC = (props) => {
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  
  useEffect(() => {
    if (location.pathname === '/admin') {
      setIsAdminModalOpen(true);
    }
  }, [location]);

  const handleLoginSuccess = () => {
    setIsAdminModalOpen(false);
  };

  return (
    <>
      <Suspense fallback={<LoadingFallback />}>
        {isAdminModalOpen && (
          <AdminLogin 
            isOpen={isAdminModalOpen} 
            onClose={() => setIsAdminModalOpen(false)}
            onLoginSuccess={handleLoginSuccess}
          />
        )}
        <AdminHandler />
      </Suspense>
      <MainContentInner {...props} />
    </>
  );
};

export default MainContent;
