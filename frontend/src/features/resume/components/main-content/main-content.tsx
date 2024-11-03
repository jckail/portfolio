import React from 'react';
import { useResume } from '@/features/resume/components/resume-provider';
import TechnicalSkills from '../sections/technical-skills';
import Experience from '../sections/experience';
import Projects from '../sections/projects';
import MyResume from '../sections/my-resume';
import AboutMe from '../sections/about-me';
import './styles/main-content.css';

const MainContent: React.FC = () => {
  const { resumeData, error, isLoading } = useResume();

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
      <AboutMe aboutMe={resumeData.aboutMe} />
      <TechnicalSkills skills={resumeData.technicalSkills} />
      <Experience experience={resumeData.experience} />
      <Projects projects={resumeData.projects} />
      <MyResume />
    </main>
  );
};

export default MainContent;
