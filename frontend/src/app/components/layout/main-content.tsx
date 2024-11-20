import React, { useState, useEffect, Suspense } from 'react';
import { Header } from '../../../shared/components/header';
import TLDR from '../sections/about';  // Keep TLDR eager loaded as it's above the fold
import { useScrollSpy } from '../../../shared/hooks/use-scroll-spy';
import { useAppLogic } from '../../providers/app-logic-provider';
import { useAdminStore } from '../../../shared/stores/admin-store';
import { ErrorBoundary } from '../../components/error-boundary';
import '../../../styles/components/layout/main-content.css';
import '../../../styles/components/layout/loading.css';

// Lazy load components below the fold
const TechnicalSkills = React.lazy(() => 
  import('../sections/skills').then(module => ({
    default: module.default,
    __esModule: true,
  }))
);

const Experience = React.lazy(() => 
  import('../sections/experience').then(module => ({
    default: module.default,
    __esModule: true,
  }))
);

const Projects = React.lazy(() => 
  import('../sections/projects').then(module => ({
    default: module.default,
    __esModule: true,
  }))
);

const MyResume = React.lazy(() => 
  import('../sections/my-resume').then(module => ({
    default: module.default,
    __esModule: true,
  }))
);

// Admin components
const AdminHandler = React.lazy(() => 
  import('../admin/admin-handler').then(module => ({
    default: module.default,
    __esModule: true,
  }))
);

const AdminLogin = React.lazy(() => 
  import('../admin/admin-login').then(module => ({
    default: module.default,
    __esModule: true,
  }))
);

// Loading fallback component
const LoadingFallback = () => (
  <div className="section-loading">
    <div className="loading-spinner"></div>
  </div>
);

// Separate Admin components to reduce main content complexity
const AdminComponents: React.FC<{ isAdminModalOpen: boolean; onClose: () => void }> = ({ 
  isAdminModalOpen, 
  onClose 
}) => {
  const handleLoginSuccess = () => {
    onClose();
  };

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        {isAdminModalOpen && (
          <AdminLogin 
            isOpen={isAdminModalOpen} 
            onClose={onClose}
            onLoginSuccess={handleLoginSuccess}
          />
        )}
        <AdminHandler />
      </Suspense>
    </ErrorBoundary>
  );
};

const MainContentInner: React.FC = () => {
  useScrollSpy();
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
        <div className="main-content">
          {/* About section is eagerly loaded */}
          <ErrorBoundary>
            <TLDR />
          </ErrorBoundary>

          {/* Each section gets its own error boundary and suspense boundary for independent loading */}
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <Experience />
            </Suspense>
          </ErrorBoundary>

          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <TechnicalSkills />
            </Suspense>
          </ErrorBoundary>

          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <Projects />
            </Suspense>
          </ErrorBoundary>

          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <MyResume />
            </Suspense>
          </ErrorBoundary>
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

  return (
    <ErrorBoundary>
      <AdminComponents 
        isAdminModalOpen={isAdminModalOpen} 
        onClose={() => setIsAdminModalOpen(false)} 
      />
      <MainContentInner {...props} />
    </ErrorBoundary>
  );
};

export default MainContent;
