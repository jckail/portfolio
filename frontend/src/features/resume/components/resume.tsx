import React from 'react';
import { ResumeData } from '@/features/resume/types';
import AboutMe from './sections/about-me';
import TechnicalSkills from './sections/technical-skills';
import Experience from './sections/experience';
import Projects from './sections/projects';
import MyResume from './sections/my-resume';
import '../styles/resume.css';

interface ResumeProps {
  resumeData: ResumeData;
}

const Resume: React.FC<ResumeProps> = ({ resumeData }) => {
  return (
    <div className="resume">
      <div className="section-container">
        <AboutMe aboutMe={resumeData.aboutMe} />
      </div>
      
      <div className="section-container">
        <TechnicalSkills skills={resumeData.technicalSkills} />
      </div>
      
      <div className="section-container">
        <Experience experience={resumeData.experience} />
      </div>
      
      <div className="section-container">
        <Projects projects={resumeData.projects} />
      </div>
      
      <div className="section-container">
        <MyResume />
      </div>
    </div>
  );
};

export default Resume;
