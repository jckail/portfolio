import React from 'react';
import { ResumeData } from '@/features/resume/types';
import AboutMe from './sections/about-me';
import TechnicalSkills from './sections/technical-skills';
import Experience from './sections/experience';
import Projects from './sections/projects';
import MyResume from './sections/my-resume';

interface ResumeProps {
  resumeData: ResumeData;
}

const Resume: React.FC<ResumeProps> = ({ resumeData }) => {
  return (
    <div className="resume">
      <AboutMe aboutMe={resumeData.aboutMe} />
      <TechnicalSkills skills={resumeData.technicalSkills} />
      <Experience experience={resumeData.experience} />
      <Projects projects={resumeData.projects} />
      <MyResume />
    </div>
  );
};

export default Resume;
