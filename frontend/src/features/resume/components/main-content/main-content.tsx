import React, { useMemo } from 'react';
import { useScrollSpy } from '../../../../shared/hooks/use-scroll-spy';
import { useResume } from '../../components/resume-provider';
import TLDR from '../sections/tldr';
import Experience from '../sections/experience';
import TechnicalSkills from '../sections/technical-skills';
import Projects from '../sections/projects';
import Contact from '../sections/contact';
import MyResume from '../sections/my-resume';
import '../../styles/sections/main-sections.css';

const MainContent = () => {
  useScrollSpy();
  const { resumeData } = useResume();

  // Memoize TLDR data since it's static
  const tldrData = useMemo(() => ({
    greeting: "hi there 👋",
    description: "I am a software engineer specializing in Ai, Analytics, and Machine Learning. With over 12 years of experience programming in Python, JavaScript, and SQL. I've helped build winning data cultures from scrappy start ups to fortune 50 companies.",
    aidetails: "Ask the ✨Ai for even more details about me!"
  }), []);

  if (!resumeData) return null;

  return (
    <div className="resume">
          <TLDR tldr={tldrData} />
          <Experience experience={resumeData.experience} />
          <TechnicalSkills />
          <Projects projects={resumeData.projects} />


      {/* <div className="section-container">
        <section id="contact">
          <Contact contact={resumeData.contact} />
        </section>
      </div> */}


          <MyResume />

    </div>
  );
};

// Prevent unnecessary re-renders
export default React.memo(MainContent);
