import React, { useEffect,useMemo } from 'react';
import TechnicalSkills from './sections/technical-skills';
import Experience from './sections/experience';
import Projects from './sections/projects';
import MyResume from './sections/my-resume';
//import AboutMe from './sections/about-me';
import TLDR from './sections/tldr';
//import Contact from '../sections/contact';
import { ResumeData } from '../types';
import { useResume } from './resume-provider';
import { useScrollSpy } from '../../../shared/hooks/use-scroll-spy';
import '../styles/main-content.css';

interface MainContentProps {
  resumeData: ResumeData | null;
  error: string | null | undefined;
}

const MainContent: React.FC<MainContentProps> = ({ resumeData, error }) => {
  const { isLoading } = useResume();
  useScrollSpy(); // Initialize scroll spy
  
  const tldrData = useMemo(() => ({
    greeting: "hi there 👋",
    description: "I am a software engineer specializing in Ai, Analytics, and Machine Learning. With over 12 years of experience programming in Python, JavaScript, and SQL. I've helped build winning data cultures from scrappy start ups to fortune 50 companies.",
    aidetails: "Ask the ✨Ai for even more details about me!"
  }), []);

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
    <div className="resume">
          <TLDR tldr={tldrData} />
          <Experience/>
          <TechnicalSkills />
          <Projects projects={resumeData.projects} />
          <MyResume />
    </div>
  );
};

export default MainContent;
