import React, { useEffect } from 'react';
import type { ParticlesConfig } from '../lib/particles/types';

interface ParticlesProviderProps {
  children: React.ReactNode;
  config: Record<string, unknown>;
}

declare global {
  interface Window {
    particlesJS?: (id: string, config: Record<string, unknown>) => void;
  }
}

function ParticlesProvider({ children, config }: ParticlesProviderProps) {
  useEffect(() => {
    // Create container
    const container = document.createElement('div');
    container.id = 'particles-js';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
      pointer-events: none;
      transition: opacity 0.3s ease-in-out;
    `;
    document.body.appendChild(container);

    // Initialize particles with a delay to ensure DOM and script are ready
    const initParticles = () => {
      if (window.particlesJS) {
        window.particlesJS('particles-js', config);
      } else {
        setTimeout(initParticles, 100);
      }
    };

    initParticles();

    // Cleanup
    return () => {
      document.getElementById('particles-js')?.remove();
    };
  }, [config]); // Re-run when config changes

  return <>{children}</>;
}

export { ParticlesProvider };
