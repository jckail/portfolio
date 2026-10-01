import React, { useState, useEffect, Suspense } from 'react';
import { useLocation } from 'react-router-dom';

import { Header } from '../../shared/components/header';
import TLDR from './sections/about';
import Footer from './footer';
import { useScrollSpy } from '../../shared/hooks/use-scroll-spy';
import { useAppLogic } from '../providers/app-logic-provider';
import { useData } from '../providers/data-provider';
import { ErrorBoundary } from './error-boundary';
import { scrollToSection } from '../../shared/utils/scroll-utils';
import { useThemeStore } from '../../shared/stores/theme-store';
import { LoadingSpinner } from '../../shared/components/loading-spinner';
import '../../styles/components/main-content.css';
import '../../styles/components/loading.css';

interface MainContentProps {
  isAdminModalOpen?: boolean;
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

type SlotName = 'experience' | 'projects' | 'skills' | 'resume';

/**
 * Reserves roughly a section's rendered height until both its chunk and the
 * shared resume data have arrived. Without this each section starts as a 48px
 * spinner and then grows to thousands of pixels, shoving everything below it
 * (the main source of layout shift on load). Heights live in main-content.css.
 */
const SectionSlot: React.FC<{ name: SlotName; children: React.ReactNode }> = ({ name, children }) => {
  const { isLoading } = useData();
  return (
    <div className={`section-slot section-slot--${name}${isLoading ? ' is-pending' : ''}`}>
      <ErrorBoundary>
        <Suspense
          fallback={
            <div className="section-skeleton" aria-hidden="true">
              <LoadingSpinner />
            </div>
          }
        >
          {children}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

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
      {/* No spinner: AdminHandler renders nothing visible, and a fallback here
          sat above the page for a moment on every load, then vanished and
          pulled the whole page up (a layout shift). */}
      <Suspense fallback={null}>
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

const MainContentInner: React.FC<MainContentProps> = () => {
  useScrollSpy();
  const { theme, toggleTheme, isToggleHidden } = useAppLogic();
  const setTheme = useThemeStore(state => state.setTheme);
  const [showDoodle, setShowDoodle] = useState(false);
  const [doodleClickCount, setDoodleClickCount] = useState(0);
  const isPartyMode = theme === 'party';

  // Handle initial hash navigation
  useEffect(() => {
    const hash = window.location.hash;
    
    // Check URL hash for doodle section
    if (hash === '#doodle') {
      setShowDoodle(true);
      setDoodleClickCount(1);
    }

    const timer = setTimeout(() => {
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
        isToggleHidden={isToggleHidden}
      />
      <main id="main-content" tabIndex={-1}>
        <div className="main-content">
          {/* About section is eagerly loaded */}
          <ErrorBoundary>
            <TLDR />
          </ErrorBoundary>

          {/* Each section gets its own error boundary and suspense boundary for independent loading */}
          <SectionSlot name="experience">
            <Experience />
          </SectionSlot>

          <SectionSlot name="projects">
            <Projects />
          </SectionSlot>

          <SectionSlot name="skills">
            <TechnicalSkills />
          </SectionSlot>

          <SectionSlot name="resume">
            <MyResume />
          </SectionSlot>

          {/* Doodle section with smooth transition */}
          {/* No spinner fallback: the doodle is collapsed until opened, so a
              48px placeholder would only appear and then vanish (a shift). */}
          <ErrorBoundary>
            <Suspense fallback={null}>
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
