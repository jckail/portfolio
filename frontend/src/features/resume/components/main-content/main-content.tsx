import { useScrollSpy } from '../../../../shared/hooks/use-scroll-spy';
import { useResume } from '../../components/resume-provider';
import { useThemeStore } from '../../../theme/stores/theme-store';
import { useAdminStore } from '../../../admin/stores/admin-store';
import Header from '../header';
import AboutMe from '../sections/about-me';
import TechnicalSkills from '../sections/technical-skills';
import Experience from '../sections/experience';
import Projects from '../sections/projects';
import MyResume from '../sections/my-resume';
import '../../styles/resume.css';

const MainContent = () => {
  useScrollSpy();
  const { resumeData, handleDownload } = useResume();
  const { theme, toggleTheme } = useThemeStore();
  const { isLoggedIn: isAdminLoggedIn } = useAdminStore();

  if (!resumeData) return null;

  const handleAdminClick = () => {
    // Admin click handler is managed by the admin store
  };

  return (
    <div className="resume">
      <Header 
        resumeData={resumeData}
        theme={theme}
        toggleTheme={toggleTheme}
        handleResumeClick={handleDownload}
        handleAdminClick={handleAdminClick}
        isAdminLoggedIn={isAdminLoggedIn}
      />
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
  );
};

export default MainContent;
