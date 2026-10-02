import React, { useState, useEffect, Suspense, useCallback } from 'react';

import { openDoodle } from '../../shared/utils/open-doodle';
import { Header } from './header/header';
import { NotFound, isKnownPath } from './not-found';
import TLDR from './sections/about';
import Footer from './footer';
import { useScrollSpy } from '../../shared/hooks/use-scroll-spy';
import { useLocation } from '../../shared/hooks/use-location';
import { useData } from '../providers/data-provider';
import { ErrorBoundary } from './error-boundary';
import { scrollToSection } from '../../shared/utils/scroll-utils';
import { useThemeStore } from '../../shared/stores/theme-store';
import { LoadingSpinner } from '../../shared/components/loading-spinner';
import '../../styles/components/main-content.css';
import '../../styles/components/loading.css';

// Lazy load components below the fold
const TechnicalSkills = React.lazy(() => import('./sections/skills'));
const Experience = React.lazy(() => import('./sections/experience'));
const Projects = React.lazy(() => import('./sections/projects'));
const MyResume = React.lazy(() => import('./sections/resume'));
const Doodle = React.lazy(() => import('./sections/doodle'));

// Admin: the Ctrl+Shift+A handler, and the dialog the /admin route opens
const AdminHandler = React.lazy(() => import('./admin/admin-handler'));
const AdminLogin = React.lazy(() => import('./admin/admin-login'));

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
            onLoginSuccess={onClose}
          />
        )}
        <AdminHandler />
      </Suspense>
    </ErrorBoundary>
  );
};

const MainContentInner: React.FC = () => {
  useScrollSpy();
  // A boolean selector: the page body re-renders only when party mode starts
  // or ends, not on every light/dark toggle (the header handles those).
  const isPartyMode = useThemeStore(state => state.theme === 'party');
  const setTheme = useThemeStore(state => state.setTheme);
  const [showDoodle, setShowDoodle] = useState(false);
  const [doodleClickCount, setDoodleClickCount] = useState(0);

  useEffect(() => {
    const reveal = () => {
      setShowDoodle(true);
      setDoodleClickCount(1);
    };
    window.addEventListener('portfolio:open-doodle', reveal);
    return () => window.removeEventListener('portfolio:open-doodle', reveal);
  }, []);

  // Handle initial hash navigation
  useEffect(() => {
    const hash = window.location.hash;
    
    // Check URL hash for doodle section
    if (hash === '#doodle') {
      setShowDoodle(true);
      setDoodleClickCount(1);
    }

    if (!hash || hash === '#doodle') return;

    // Scroll once the lazy sections have had time to mount. One timer (it
    // used to be a 500ms timer nested in a 100ms one, and only the outer one
    // was cleared on unmount).
    const timer = setTimeout(() => scrollToSection(hash.substring(1)), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleDoodleToggle = useCallback(() => {
    if (isPartyMode) {
      // End party mode
      setTheme('dark');
      setDoodleClickCount(1); // Reset to "Click again to doodle more" state
    } else if (doodleClickCount === 0) {
      // First click: Show doodle and update URL hash
      openDoodle();
      setDoodleClickCount(1);
    } else if (doodleClickCount === 1) {
      // Second click: Set theme to party
      setTheme('party');
      setDoodleClickCount(2);
    }
  }, [isPartyMode, doodleClickCount, setTheme]);

  return (
    <div className="main">
      <Header />
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
            isPartyMode={isPartyMode}
          />
        </div>
      </main>
    </div>
  );
};

const MemoMainContentInner = React.memo(MainContentInner);

const MainContent: React.FC = () => {
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname === '/admin') {
      setIsAdminModalOpen(true);
    }
  }, [pathname]);

  const closeAdmin = useCallback(() => setIsAdminModalOpen(false), []);

  if (!isKnownPath(pathname)) {
    return (
      <ErrorBoundary>
        <NotFound pathname={pathname} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AdminComponents isAdminModalOpen={isAdminModalOpen} onClose={closeAdmin} />
      {/* Memoised: a route or admin-dialog change must not re-render the page */}
      <MemoMainContentInner />
    </ErrorBoundary>
  );
};

export default MainContent;
