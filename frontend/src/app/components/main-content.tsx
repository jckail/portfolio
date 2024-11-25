import React, { useState, useEffect, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from '../../shared/components/header';
import TLDR from './sections/about';
import Footer from './footer';
import { useScrollSpy } from '../../shared/hooks/use-scroll-spy';
import { useAppLogic } from '../providers/app-logic-provider';
import { useAdminStore } from '../../shared/stores/admin-store';
import { ErrorBoundary } from './error-boundary';
import { scrollToSection } from '../../shared/utils/scroll-utils';
import { useThemeStore } from '../../shared/stores/theme-store';
import '../../styles/components/main-content.css';
import '../../styles/components/loading.css';

interface MainContentProps {
  showContactModal?: boolean;
}

// Lazy load components below the fold
const TechnicalSkills = React.lazy(() => 
  import('./sections/skills').then(module => ({
    default: module.default,
    __esModule: true,
  }))
);

const Experience = React.lazy(() => 
  import('./sections/experience').then(module => ({
    default: module.default,
    __esModule: true,
  }))
);

const Projects = React.lazy(() => 
  import('./sections/projects').then(module => ({
    default: module.default,
    __esModule: true,
  }))
);

const MyResume = React.lazy(() => 
  import('./sections/resume').then(module => ({
    default: module.default,
    __esModule: true,
  }))
);

const Doodle = React.lazy(() => 
  import('./sections/doodle').then(module => ({
    default: module.default,
    __esModule: true,
  }))
);

// Admin components
const AdminHandler = React.lazy(() => 
  import('./admin/admin-handler').then(module => ({
    default: module.default,
    __esModule: true,
  }))
);

const AdminLogin = React.lazy(() => 
  import('./admin/admin-login').then(module => ({
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

const MainContentInner: React.FC<MainContentProps> = ({ showContactModal }) => {
  useScrollSpy();
  const { theme, toggleTheme, isToggleHidden } = useAppLogic();
  const setTheme = useThemeStore(state => state.setTheme);
  const { isLoggedIn: isAdminLoggedIn } = useAdminStore();
  const [contentLoaded, setContentLoaded] = useState(false);
  const [showDoodle, setShowDoodle] = useState(false);
  const [doodleClickCount, setDoodleClickCount] = useState(0);
  const isPartyMode = theme === 'party';
  const location = useLocation();

  // Extract experience slug from URL if present
  const experienceSlug = location.pathname.startsWith('/experience/') 
    ? location.pathname.split('/experience/')[1]
    : undefined;

  // Handle initial hash navigation
  useEffect(() => {
    const hash = window.location.hash;
    
    // Check URL hash for doodle section
    if (hash === '#doodle') {
      setShowDoodle(true);
      setDoodleClickCount(1);
    }

    // Set a flag when the component mounts
    const timer = setTimeout(() => {
      setContentLoaded(true);
      
      // Handle scrolling to section after content is loaded
      if (hash && hash !== '#doodle') {
        const sectionId = hash.substring(1);
        // Add a longer delay to ensure all lazy-loaded components are rendered
        setTimeout(() => {
          scrollToSection(sectionId);
        }, 500); // Increased delay to ensure components are mounted
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleResumeClick = () => {
    const resumeSection = document.getElementById('resume');
    if (resumeSection) {
      resumeSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAdminClick = () => {
    console.log('Admin click');
  };

  const handleDoodleToggle = () => {
    if (isPartyMode) {
      // End party mode
      setTheme('dark');
      setDoodleClickCount(1); // Reset to "Click again to doodle more" state
    } else if (doodleClickCount === 0) {
      // First click: Show doodle and update URL hash
      setShowDoodle(true);
      window.history.pushState(null, '', '#doodle');
      // Scroll to doodle section
      setTimeout(() => {
        const doodleSection = document.getElementById('doodle');
        if (doodleSection) {
          doodleSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      setDoodleClickCount(1);
    } else if (doodleClickCount === 1) {
      // Second click: Set theme to party
      setTheme('party');
      setDoodleClickCount(2);
    }
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
            <TLDR showContactModal={showContactModal} />
          </ErrorBoundary>

          {/* Each section gets its own error boundary and suspense boundary for independent loading */}
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <Experience experienceSlug={experienceSlug} />
            </Suspense>
          </ErrorBoundary>

          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <Projects />
            </Suspense>
          </ErrorBoundary>

          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <TechnicalSkills />
            </Suspense>
          </ErrorBoundary>

          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <MyResume />
            </Suspense>
          </ErrorBoundary>

          {/* Doodle section with smooth transition */}
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <Doodle isVisible={showDoodle} isPartyMode={isPartyMode} />
            </Suspense>
          </ErrorBoundary>

          {/* Footer with doodle toggle handler and theme toggle */}
          <Footer 
            onDoodleToggle={handleDoodleToggle} 
            doodleClickCount={doodleClickCount}
            toggleTheme={toggleTheme}
            isPartyMode={isPartyMode}
          />
        </div>
      </main>
    </div>
  );
};

const MainContent: React.FC<MainContentProps> = (props) => {
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const location = useLocation();
  
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
