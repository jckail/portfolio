import React from 'react';
import { AppLogicProvider } from '@/app/providers/app-logic-provider';
import { ResumeProvider } from '@/features/resume/components/resume-provider';
import { MainLayout } from '@/features/layouts';
import MainContent from '@/features/resume/components/main-content/main-content';
import './styles/app.css';

const App: React.FC = () => {
  return (
    <AppLogicProvider>
      <ResumeProvider>
        <MainLayout>
          <MainContent />
        </MainLayout>
      </ResumeProvider>
    </AppLogicProvider>
  );
};

export default App;
