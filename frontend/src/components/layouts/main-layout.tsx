import React from 'react';
import Header from '../../features/resume/components/header';
import { useResume } from '../ResumeProvider';
import { useAppLogic } from '../AppLogicProvider';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { resumeData } = useResume();
  const { theme } = useAppLogic();

  return (
    <div className="layout">
      <Header 
        resumeData={resumeData}
        theme={theme}
      />
      <main>
        {children}
      </main>
    </div>
  );
};
