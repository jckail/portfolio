import React, { useEffect } from 'react';
import type { ParticlesConfig } from '../lib/particles/types';

interface ParticlesContextType {
  particlesLoaded: boolean;
}

interface ParticlesProviderProps {
  children: React.ReactNode;
  updateParticlesConfig: () => ParticlesConfig;
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

export function useParticles(): ParticlesContextType {
  const context = React.useContext(ParticlesContext);
  if (!context) {
    throw new Error('useParticles must be used within a ParticlesProvider');
  }
  return context;
}

export function ParticlesProvider({ children, updateParticlesConfig }: ParticlesProviderProps) {
  const [particlesLoaded, setParticlesLoaded] = React.useState(false);

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
    window.particlesJS('particles-js', config as unknown as Record<string, unknown>);
    setParticlesLoaded(true);
  };

  useEffect(() => {
    let particlesContainer = document.getElementById('particles-js');
    if (!particlesContainer) {
      particlesContainer = document.createElement('div');
      particlesContainer.id = 'particles-js';
      particlesContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: -1;
        pointer-events: none;
      `;
      document.body.insertBefore(particlesContainer, document.body.firstChild);
    }

    const checkAndInit = () => {
      if (typeof window.particlesJS === 'function') {
        initParticles();
      } else {
        setTimeout(checkAndInit, 100);
      }
    };

    checkAndInit();

    // Watch for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          initParticles();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => {
      destroyParticles();
      particlesContainer?.remove();
      observer.disconnect();
    };
  }, [updateParticlesConfig]);

  const value = {
    particlesLoaded
  };

  return (
    <ParticlesContext.Provider value={value}>
      {children}
    </ParticlesContext.Provider>
  );
}
