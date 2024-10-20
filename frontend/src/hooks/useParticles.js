import { useState, useEffect } from 'react';

export const useParticles = (updateParticlesConfig) => {
  const [particlesLoaded, setParticlesLoaded] = useState(false);

  useEffect(() => {
    if (window.particlesJS && !particlesLoaded) {
      window.particlesJS('particles-js', updateParticlesConfig());
      setParticlesLoaded(true);
    } else if (window.particlesJS && particlesLoaded) {
      window.pJSDom[0].pJS.fn.vendors.destroypJS();
      window.pJSDom = [];
      window.particlesJS('particles-js', updateParticlesConfig());
    }
  }, [particlesLoaded, updateParticlesConfig]);

  return { particlesLoaded };
};
