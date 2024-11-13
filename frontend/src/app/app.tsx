import React, { lazy, Suspense } from 'react';
import { MainLayout } from '../features/layouts';
import MainContent from '../features/resume/components/main-content/main-content';
import { ParticlesProvider } from '../features/theme/components/particles-provider';
import { BackgroundProvider } from '../features/theme/components/background-provider';
import { useThemeStore } from '../features/theme/stores/theme-store';
import { useThemeBackground } from '../features/theme/hooks/use-theme-background';
import { getThemeConfig } from '../features/theme/lib/get-theme-config';
import { ErrorBoundary } from './components/error-boundary';
import { LoadingBoundary } from './components/loading-boundary';
import { useResume } from '../features/resume/components/resume-provider';
import './styles/app.css';

// Lazy load non-critical components
const ChatPortal = lazy(() => import('../features/resume/components/ChatPortal'));
const AdminHandler = lazy(() => import('../features/admin/components/admin-handler'));

const App: React.FC = () => {
  const { theme } = useThemeStore();
  const backgroundColor = useThemeBackground(theme);
  const { isLoading } = useResume();
  
  return (
    <ErrorBoundary>
      <LoadingBoundary>
        <>
          <BackgroundProvider backgroundColor={backgroundColor}>
            <ParticlesProvider config={getThemeConfig(theme)} isResumeLoaded={!isLoading}>
              <MainLayout>
                <MainContent />
              </MainLayout>
            </ParticlesProvider>
          </BackgroundProvider>
          
          {/* Lazy load non-critical components */}
          <Suspense fallback={null}>
            <ChatPortal />
          </Suspense>
          
          <Suspense fallback={null}>
            <AdminHandler />
          </Suspense>
        </>
      </LoadingBoundary>
    </ErrorBoundary>
  );
};

// Prevent unnecessary re-renders
export default React.memo(App);
