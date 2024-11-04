import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainContent from '../features/resume/components/main-content';
import { useResume } from '../features/resume/components/resume-provider';

const AppRoutes = () => {
  const { resumeData, error } = useResume();

  return (
    <Routes>
      <Route path="/" element={<MainContent resumeData={resumeData} error={error} />} />
    </Routes>
  );
};

export default AppRoutes;
