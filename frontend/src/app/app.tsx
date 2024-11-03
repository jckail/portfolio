import React from 'react';
import { MainLayout } from '../components/layouts/main-layout';
import { ResumeProvider, useResume } from '../components/ResumeProvider';
import Resume from '../features/resume/components/resume';
import { AppLogicProvider } from '../components/AppLogicProvider';

const AppContent: React.FC = () => {
  const { resumeData } = useResume();

  if (!resumeData) {
    return null;
  }

  return (
    <MainLayout>
      <Resume resumeData={resumeData} />
    </MainLayout>
  );
};

const App: React.FC = () => {
  return (
    <AppLogicProvider>
      <ResumeProvider>
        <AppContent />
      </ResumeProvider>
    </AppLogicProvider>
  );
};

export default App;
