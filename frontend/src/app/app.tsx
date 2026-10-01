import React, { useEffect, useMemo } from 'react';

import MainContent from './components/main-content';
import { ParticlesProvider } from './providers/particles-provider';
import { DataProvider } from './providers/data-provider';
import { ResumeProvider } from './providers/resume-provider';
import { useThemeStore } from '../shared/stores/theme-store';
import { useKeyboardShortcuts } from '../shared/hooks/use-keyboard-shortcuts';
import { useLocation } from '../shared/hooks/use-location';
import { useEasterEggs } from '../shared/hooks/use-easter-eggs';
import { getThemeConfig } from '../shared/utils/theme/get-theme-config';
import { ErrorBoundary } from './components/error-boundary';
import { initializeAnalytics, trackPageView, trackAnchorChange } from '../shared/utils/analytics';
import CookieConsentPortal from '../shared/components/cookie/cookie-consent-portal';
import { CommandPaletteHost } from '../shared/components/command-palette-host';
import ReadingProgress from '../shared/components/reading-progress';
import ChatPortal from './components/chat/chat-portal';
import { isTheme } from '../types/theme';
import '../styles/base/app.css';

/**
 * Theme-dependent particles around the page. It is the only part of the
 * shell that subscribes to the theme: `children` are elements App created,
 * so when the theme changes React re-renders this wrapper and skips the
 * subtree (anything inside that cares reads the store itself).
 */
const ThemedParticles: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useThemeStore(state => state.theme);
  const config = useMemo(() => getThemeConfig(theme), [theme]);
  return <ParticlesProvider config={config}>{children}</ParticlesProvider>;
};

/**
 * Page-view analytics. Its own component so a navigation re-renders nothing
 * but this.
 *
 * Exactly one event fires per navigation, not both: trackAnchorChange already
 * sends its own page_view (needed since useScrollSpy calls it directly,
 * bypassing this effect), so also calling trackPageView for the same location
 * would double-count the pageview in GA4.
 */
const NavigationAnalytics: React.FC = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    Promise.resolve(initializeAnalytics()).catch(error => {
      console.error('Failed to initialize analytics:', error);
    });
  }, []);

  useEffect(() => {
    const track = hash ? trackAnchorChange(hash.slice(1)) : trackPageView(pathname);
    Promise.resolve(track).catch(error => {
      console.error('Failed to track navigation:', error);
    });
  }, [pathname, hash]);

  return null;
};

/** Theme changes requested from outside React (chat tool actions, palette). */
function useThemeEvents() {
  const setTheme = useThemeStore(state => state.setTheme);

  useEffect(() => {
    const onSetTheme = (event: Event) => {
      const themeName = (event as CustomEvent<{ theme?: string }>).detail?.theme;
      if (isTheme(themeName)) setTheme(themeName);
    };
    const onParty = () => setTheme('party');
    window.addEventListener('portfolio:set-theme', onSetTheme);
    window.addEventListener('portfolio:party', onParty);
    return () => {
      window.removeEventListener('portfolio:set-theme', onSetTheme);
      window.removeEventListener('portfolio:party', onParty);
    };
  }, [setTheme]);
}

const App: React.FC = () => {
  useKeyboardShortcuts();
  useEasterEggs();
  useThemeEvents();

  return (
    <ErrorBoundary>
      <DataProvider>
        <ResumeProvider>
          {/* No key={theme} here: re-keying remounted the entire page on every
              theme toggle (refetching sections, resetting scroll-spy and
              modals) just to restart the particles, which ParticlesCanvas now
              does by itself when `config` changes. */}
          <ThemedParticles>
            {/* width: #root is a centred flex column, so without it this
                wrapper shrinks to its content and the page visibly widens
                once the sections arrive (CLS). */}
            <div style={{ isolation: 'isolate', width: '100%' }}>
              {/* First tab stop: lets keyboard users bypass the header and
                  the whole side-panel nav on every page load. */}
              <a className="skip-to-content" href="#main-content">
                Skip to main content
              </a>
              <ReadingProgress />

              {/* Main content in its own error boundary */}
              <ErrorBoundary>
                <MainContent />
              </ErrorBoundary>

              {/* Tiny launcher; the chat panel itself is lazy-loaded inside */}
              <ChatPortal />

              <CookieConsentPortal />
              <CommandPaletteHost />
            </div>
          </ThemedParticles>
        </ResumeProvider>
      </DataProvider>
      {/* After the page so its effects run after the page's own (scroll-spy
          reports the initial anchor first), as when this lived in App. */}
      <NavigationAnalytics />
    </ErrorBoundary>
  );
};

export default App;
