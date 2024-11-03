import { useEffect, useMemo, useState } from 'react';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { ISourceOptions, Engine } from "@tsparticles/engine";

import './styles/variables.css';
import './App.css';
import Header from './components/Header';
import MainContent from './components/MainContent';
import { useResume } from './components/ResumeProvider';
import { useAppLogic } from './components/AppLogicProvider';

function App() {
  const { resumeData, error, handleDownload } = useResume();
  const { theme, toggleTheme, isAdminLoggedIn, setIsAdminLoggedIn } = useAppLogic();
  const [init, setInit] = useState(false);

  useEffect(() => {
    const initParticles = async () => {
      try {
        await initParticlesEngine(async (engine: Engine) => {
          await loadSlim(engine);
        });
        setInit(true);
      } catch (err) {
        console.error('Error initializing particles:', err);
      }
    };

    initParticles();
  }, []);

  const options: ISourceOptions = useMemo(() => ({
    fullScreen: {
      enable: true,
      zIndex: -1
    },
    background: {
      color: {
        value: theme === 'light' ? '#ffffff' : '#1a1a1a',
      },
    },
    fpsLimit: 120,
    interactivity: {
      events: {
        onHover: {
          enable: true,
          mode: "repulse",
        },
      },
      modes: {
        repulse: {
          distance: 100,
          duration: 0.4,
        },
      },
    },
    particles: {
      color: {
        value: theme === 'light' ? 'rgba(74, 158, 255, 0.3)' : 'rgba(74, 158, 255, 0.2)',
      },
      links: {
        color: theme === 'light' ? 'rgba(74, 158, 255, 0.2)' : 'rgba(74, 158, 255, 0.1)',
        distance: 150,
        enable: true,
        opacity: 0.2,
        width: 1,
      },
      move: {
        direction: "none",
        enable: true,
        outModes: {
          default: "bounce",
        },
        random: false,
        speed: 1,
        straight: false,
      },
      number: {
        density: {
          enable: true,
          area: 800,
        },
        value: 80,
      },
      opacity: {
        value: 0.2,
      },
      shape: {
        type: "circle",
      },
      size: {
        value: { min: 1, max: 3 },
      },
    },
    detectRetina: true,
  }), [theme]);

  return (
    <>
      {init && (
        <Particles
          id="tsparticles"
          options={options}
        />
      )}
      <div className="app-container">
        <Header 
          resumeData={resumeData}
          theme={theme}
          toggleTheme={toggleTheme}
          handleResumeClick={handleDownload}
          handleAdminClick={() => setIsAdminLoggedIn(!isAdminLoggedIn)}
          isAdminLoggedIn={isAdminLoggedIn}
        />
        <div className="app">
          <MainContent 
            resumeData={resumeData}
            error={error}
          />
        </div>
      </div>
    </>
  );
}

export default App;
