import React from 'react';
import TechnicalSkills from '../sections/TechnicalSkills';
import Experience from '../sections/Experience';
import Projects from '../sections/Projects';
import MyResume from '../sections/MyResume';
import { ResumeData } from '../features/resume/types';
import { useResume } from './ResumeProvider';

interface MainContentProps {
  resumeData: ResumeData | null;
  error: string | null | undefined;
}

const MainContent: React.FC<MainContentProps> = ({ resumeData, error }) => {
  const { isLoading } = useResume();

  if (isLoading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading resume data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        <p>{error}</p>
        <p>Please try refreshing the page.</p>
      </div>
    );
  }

  if (!resumeData) {
    return (
      <div className="error-message">
        <p>No resume data available.</p>
        <p>Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <main className="main-content">
      <div className="about-me section">
        <h2>About Me</h2>
        <p>{resumeData.aboutMe}</p>
      </div>
      <TechnicalSkills skills={resumeData.technicalSkills} />
      <Experience experience={resumeData.experience} />
      <Projects projects={resumeData.projects} />
      <MyResume />
    </main>
  );
};

export default MainContent;
