import React from 'react';
import Header from '../../../features/content/components/header';
import { useResume } from '../../../features/content/components/resume-provider';
import { useAppLogic } from '../../../app/providers/app-logic-provider';
import { useAdminStore } from '../../../features/admin/stores/admin-store';
import '../styles/main-layout.css';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { resumeData } = useResume();
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
        resumeData={resumeData}
        theme={theme}
        toggleTheme={toggleTheme}
        handleResumeClick={handleResumeClick}
        handleAdminClick={handleAdminClick}
        isAdminLoggedIn={isAdminLoggedIn}
        isToggleHidden={isToggleHidden}
      />
      <main>
        {children}
      </main>
    </div>
  );
};
