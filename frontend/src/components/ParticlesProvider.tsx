import React, { createContext, useContext, useState, useEffect } from 'react';

interface ParticlesContextType {
  particlesLoaded: boolean;
}

interface ParticlesProviderProps {
  children: React.ReactNode;
  updateParticlesConfig: () => any;
}

declare global {
  interface Window {
    particlesJS: any;
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

const ParticlesContext = createContext<ParticlesContextType | undefined>(undefined);

// Separate hook into its own named function declaration
function useParticles(): ParticlesContextType {
  const context = useContext(ParticlesContext);
  if (!context) {
    throw new Error('useParticles must be used within a ParticlesProvider');
  }
  return context;
}

// Separate component into its own named function declaration
function ParticlesProvider({ children, updateParticlesConfig }: ParticlesProviderProps) {
  const [particlesLoaded, setParticlesLoaded] = useState(false);

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

    // Create particles container if it doesn't exist
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

    // Wait for DOM and particles.js to be ready
    const checkAndInit = () => {
      if (window.particlesJS) {
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
