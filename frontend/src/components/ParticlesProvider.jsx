import React, { createContext, useContext, useState, useEffect } from 'react';

const ParticlesContext = createContext();

export const useParticles = () => {
  const context = useContext(ParticlesContext);
  if (!context) {
    throw new Error('useParticles must be used within a ParticlesProvider');
  }
  return context;
};

export function ParticlesProvider({ children, updateParticlesConfig }) {
  const [particlesLoaded, setParticlesLoaded] = useState(false);

  useEffect(() => {
    const destroyParticles = () => {
      if (window.pJSDom && window.pJSDom[0] && window.pJSDom[0].pJS) {
        window.pJSDom[0].pJS.fn.vendors.destroypJS();
        window.pJSDom = [];
      }
    };

    if (window.particlesJS) {
      if (particlesLoaded) {
        destroyParticles();
      }
      window.particlesJS('particles-js', updateParticlesConfig());
      setParticlesLoaded(true);
    }

    // Cleanup function
    return () => {
      destroyParticles();
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
