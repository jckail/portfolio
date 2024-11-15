import { RouteObject } from 'react-router-dom';
import { useMemo } from 'react';
import { MainLayout } from '../features/layouts';
import MainContent from '../features/content/components/main-content';
import { ParticlesProvider } from '../features/theme/components/particles-provider';
import { useThemeStore } from '../features/theme/stores/theme-store';
import { getThemeConfig } from '../features/theme/lib/get-theme-config';
import AdminLogin from '../features/admin/components/admin-login';
import { useState } from 'react';
import { useResume } from '../features/content/components/resume-provider';

const AppRoutes = () => {
  const theme = useThemeStore(state => state.theme);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const { resumeData, error } = useResume();

  const baseConfig = useMemo(() => getThemeConfig(theme), [theme]);

  const handleLoginSuccess = () => {
    setIsAdminModalOpen(false);
  };

  return (
    <ParticlesProvider config={baseConfig}>
      <MainLayout>
        <MainContent resumeData={resumeData} error={error} />
        <AdminLogin 
          isOpen={isAdminModalOpen} 
          onClose={() => setIsAdminModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      </MainLayout>
    </ParticlesProvider>
  );
};

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppRoutes />,
  },
  {
    path: '/admin',
    element: <AppRoutes />,
  }
];
