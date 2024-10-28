import React from 'react';
import AboutMe from '../sections/AboutMe';
import TechnicalSkills from '../sections/TechnicalSkills';
import Experience from '../sections/Experience';
import Projects from '../sections/Projects';
import MyResume from '../sections/MyResume';

const MainContent = ({ resumeData, error, setSectionRef }) => {
  return (
    <main>
      {error && (
        <div className="error-message">
          <p>Error: {error}</p>
        </div>
      )}
      {!resumeData && !error && <div className="loading">Loading resume data...</div>}
      {resumeData && (
        <>
          <AboutMe aboutMe={resumeData.aboutMe} ref={el => setSectionRef('about-me', el)} />
          <TechnicalSkills skills={resumeData.technicalSkills} ref={el => setSectionRef('technical-skills', el)} />
          <Experience experience={resumeData.experience} ref={el => setSectionRef('experience', el)} />
          <Projects projects={resumeData.projects} ref={el => setSectionRef('projects', el)} />
          <MyResume ref={el => setSectionRef('my-resume', el)} />
        </>
      )}
    </main>
  );
};

export default MainContent;
