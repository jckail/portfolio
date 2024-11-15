import React from 'react';
import TechnicalSkills from './sections/skills';
import Experience from './sections/experience';
import Projects from './sections/projects';
import MyResume from './sections/my-resume';
import TLDR from './sections/tldr';
import { useScrollSpy } from '../../../shared/hooks/use-scroll-spy';
import { LoadingProvider, useLoading } from '../context/loading-context';
import '../styles/main-content.css';
import '../styles/loading.css';

interface MainContentProps {
  error: string | null | undefined;
}

const MainContentInner: React.FC<MainContentProps> = ({ error }) => {
  useScrollSpy();
  const { loadingStates } = useLoading();

  if (error) {
    return (
      <div className="error-message">
        <p>{error}</p>
        <p>Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="resume">
      <div className="loading-states">
        {Object.entries(loadingStates).map(([section, isLoading]) => (
          isLoading && (
            <div key={section} className="loading-item pending">
              {section}: Loading...
            </div>
          )
        ))}
      </div>
      <TLDR />
      <Experience />
      <TechnicalSkills />
      <Projects />
      <MyResume />
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
