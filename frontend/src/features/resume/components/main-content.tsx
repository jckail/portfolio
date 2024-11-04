import React, { useEffect } from 'react';
import TechnicalSkills from './sections/technical-skills';
import Experience from './sections/experience';
import Projects from './sections/projects';
import MyResume from './sections/my-resume';
import AboutMe from './sections/about-me';
import { ResumeData } from '../types';
import { useResume } from './resume-provider';
import { useScrollSpy } from '../../../shared/hooks/use-scroll-spy';
import './styles/main-content.css';

interface MainContentProps {
  resumeData: ResumeData | null;
  error: string | null | undefined;
}

const MainContent: React.FC<MainContentProps> = ({ resumeData, error }) => {
  const { isLoading } = useResume();
  useScrollSpy(); // Initialize scroll spy

  useEffect(() => {
    // Force a layout recalculation after content loads
    if (!isLoading && resumeData) {
      window.dispatchEvent(new Event('resize'));
    }
  }, [isLoading, resumeData]);

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
    <div className="main-content">
      <div className="main-content-inner">
        <section id="about" className="section">
          <AboutMe aboutMe={resumeData.aboutMe} />
        </section>
        <section id="skills" className="section">
          <TechnicalSkills skills={resumeData.technicalSkills} />
        </section>
        <section id="experience" className="section">
          <Experience experience={resumeData.experience} />
        </section>
        <section id="projects" className="section">
          <Projects projects={resumeData.projects} />
        </section>
        <section id="resume" className="section">
          <MyResume />
        </section>
      </div>
    </div>
  );
};

export default MainContent;
