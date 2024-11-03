import React from 'react';
import { ResumeData } from '../types';
import AboutMe from '../../../sections/AboutMe';
import TechnicalSkills from '../../../sections/TechnicalSkills';
import Experience from '../../../sections/Experience';
import Projects from '../../../sections/Projects';

interface ResumeProps {
  resumeData: ResumeData;
}

const Resume: React.FC<ResumeProps> = ({ resumeData }) => {
  if (!resumeData) {
    return null;
  }

  return (
    <div className="resume-content">
      <AboutMe aboutMe={resumeData.about_me} />
      <TechnicalSkills skills={resumeData.skills} />
      <Experience experience={resumeData.experience} />
      <Projects projects={resumeData.projects} />
    </div>
  );
};

export default Resume;
