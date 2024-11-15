import React from 'react';
import Header from './header';
import TechnicalSkills from './sections/skills';
import Experience from './sections/experience';
import Projects from './sections/projects';
import MyResume from './sections/my-resume';
import TLDR from './sections/tldr';
import { useScrollSpy } from '../../../shared/hooks/use-scroll-spy';
import { LoadingProvider, useLoading } from '../context/loading-context';
import { useAppLogic } from '../../../app/providers/app-logic-provider';
import { useAdminStore } from '../../../features/admin/stores/admin-store';
import '../styles/main-content.css';
import '../styles/loading.css';


interface MainContentProps {
  error: string | null | undefined;
}

const MainContentInner: React.FC<MainContentProps> = ({ error }) => {
  useScrollSpy();
  const { loadingStates } = useLoading();
  const { theme, toggleTheme, isToggleHidden } = useAppLogic();
  const { isLoggedIn: isAdminLoggedIn } = useAdminStore();

  const handleResumeClick = () => {
    const resumeSection = document.getElementById('resume');
    if (resumeSection) {
      resumeSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAdminClick = () => {
    // This should be handled by the admin feature
    console.log('Admin click');
  };

  if (error) {
    return (
      <div className="error-message">
        <p>{error}</p>
        <p>Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="layout">
      <Header 
        theme={theme}
        toggleTheme={toggleTheme}
        handleResumeClick={handleResumeClick}
        handleAdminClick={handleAdminClick}
        isAdminLoggedIn={isAdminLoggedIn}
        isToggleHidden={isToggleHidden}
      />
      <main>
        <div className="loading-states">
          {Object.entries(loadingStates).map(([section, isLoading]) => (
            isLoading && (
              <div key={section} className="loading-item pending">
                {section}: Loading...
              </div>
            )
          ))}
        </div>
        <div className="resume">
          <TLDR />
          <Experience />
          <TechnicalSkills />
          <Projects />
          <MyResume />
        </div>
      </main>
    </div>
  );
};

const MainContent: React.FC<MainContentProps> = (props) => {
  return (
    <LoadingProvider>
      <MainContentInner {...props} />
    </LoadingProvider>
  );
};

export default MainContent;
