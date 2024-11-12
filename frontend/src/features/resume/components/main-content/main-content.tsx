import { useScrollSpy } from '../../../../shared/hooks/use-scroll-spy';
import { useResume } from '../../components/resume-provider';
import TLDR from '../sections/tldr';
import AboutMe from '../sections/about-me';
import TechnicalSkills from '../sections/technical-skills';
import Experience from '../sections/experience';
import Projects from '../sections/projects';
import MyResume from '../sections/my-resume';

import '../../styles/resume.css';

const MainContent = () => {
  useScrollSpy();
  const { resumeData } = useResume();

  if (!resumeData) return null;

  const handleResumeClick = () => {
    const resumeSection = document.getElementById('resume');
    if (resumeSection) {
      resumeSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <div className="resume">
        <div className="section-container">
          <section id="tldr">
            <TLDR 
              tldr={{
                greeting: "hi there 👋",
                description: "I am a software engineer specializing in Ai, Analytics, and Machine Learning. With over 12 years of experience programming in Python, JavaScript, and SQL. I’ve helped build winning data cultures from scrappy start ups to fortune 50 companies.",
                aidetails: "Ask the ✨Ai for even more details about me!"
              }}
            />
          </section>
        </div>

        <div className="section-container">
          <section id="about">
            <AboutMe aboutMe={resumeData.aboutMe} />
          </section>
        </div>
        
        <div className="section-container">
          <section id="skills">
            <TechnicalSkills skills={resumeData.technicalSkills} />
          </section>
        </div>
        
        <div className="section-container">
          <section id="experience">
            <Experience experience={resumeData.experience} />
          </section>
        </div>
        
        <div className="section-container">
          <section id="projects">
            <Projects projects={resumeData.projects} />
          </section>
        </div>
        
        <div className="section-container">
          <section id="resume">
            <MyResume />
          </section>
        </div>
      </div>
    </>
  );
};

export default MainContent;
