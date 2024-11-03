import React, { useEffect } from 'react';

interface ParticlesContextType {
  particlesLoaded: boolean;
}

interface ParticlesProviderProps {
  children: React.ReactNode;
  updateParticlesConfig: () => Record<string, unknown>;
}

declare global {
  interface Window {
    particlesJS?: (id: string, config: Record<string, unknown>) => void;
    pJSDom?: Array<{
      pJS: {
        fn: {
          vendors: {
            destroypJS: () => void;
          };
        };
      };
    }>;
  }
}

const ParticlesContext = React.createContext<ParticlesContextType | undefined>(undefined);

function useParticles(): ParticlesContextType {
  const context = React.useContext(ParticlesContext);
  if (!context) {
    throw new Error('useParticles must be used within a ParticlesProvider');
  }
  return context;
}

function ParticlesProvider({ children, updateParticlesConfig }: ParticlesProviderProps) {
  const [particlesLoaded, setParticlesLoaded] = React.useState(false);

  useEffect(() => {
    const destroyParticles = () => {
      if (window.pJSDom?.[0]?.pJS) {
        window.pJSDom[0].pJS.fn.vendors.destroypJS();
        window.pJSDom = [];
      }
    };

    const initParticles = () => {
      if (!window.particlesJS) {
        console.warn('particles.js not loaded');
        return;
      }

      if (particlesLoaded) {
        destroyParticles();
      }

      const config = updateParticlesConfig();
      window.particlesJS('particles-js', config);
      setParticlesLoaded(true);
    };

    let particlesContainer = document.getElementById('particles-js');
    if (!particlesContainer) {
      particlesContainer = document.createElement('div');
      particlesContainer.id = 'particles-js';
      particlesContainer.style.position = 'fixed';
      particlesContainer.style.top = '0';
      particlesContainer.style.left = '0';
      particlesContainer.style.width = '100%';
      particlesContainer.style.height = '100%';
      particlesContainer.style.zIndex = '-1';
      document.body.appendChild(particlesContainer);
    }

    const checkAndInit = () => {
      if (typeof window.particlesJS === 'function') {
        initParticles();
      } else {
        setTimeout(checkAndInit, 100);
      }
    };

    checkAndInit();

    return () => {
      destroyParticles();
      particlesContainer?.remove();
    };
  }, [particlesLoaded, updateParticlesConfig]);

  const value = {
    particlesLoaded
  };

  return (
    <ParticlesContext.Provider value={value}>
      {children}
    </ParticlesContext.Provider>
  );
}

export { ParticlesProvider, useParticles };
