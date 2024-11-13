import React, { lazy, Suspense, useMemo } from 'react';
import { useScrollSpy } from '../../../../shared/hooks/use-scroll-spy';
import { useResume } from '../../components/resume-provider';
import TLDR from '../sections/tldr';
import '../../styles/resume.css';

// Lazy load sections that are not immediately visible
const Experience = lazy(() => import('../sections/experience'));
const TechnicalSkills = lazy(() => import('../sections/technical-skills'));
const Projects = lazy(() => import('../sections/projects'));
const MyResume = lazy(() => import('../sections/my-resume'));

// Loading placeholder
const SectionLoader = () => (
  <div className="section-loading" style={{ minHeight: '200px' }} />
);

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
      <div className="section-container">
        <section id="tldr">
          <TLDR tldr={tldrData} />
        </section>
      </div>

      <div className="section-container">
        <section id="experience">
          <Suspense fallback={<SectionLoader />}>
            <Experience experience={resumeData.experience} />
          </Suspense>
        </section>
      </div>

      <div className="section-container">
        <section id="skills">
          <Suspense fallback={<SectionLoader />}>
            <TechnicalSkills skills={resumeData.technicalSkills} />
          </Suspense>
        </section>
      </div>

      <div className="section-container">
        <section id="projects">
          <Suspense fallback={<SectionLoader />}>
            <Projects projects={resumeData.projects} />
          </Suspense>
        </section>
      </div>

      <div className="section-container">
        <section id="resume">
          <Suspense fallback={<SectionLoader />}>
            <MyResume />
          </Suspense>
        </section>
      </div>
    </div>
  );
};

// Prevent unnecessary re-renders
export default React.memo(MainContent);
