import React, { useEffect } from 'react';
import type { ParticlesConfig } from '../lib/particles/types';

interface ParticlesProviderProps {
  children: React.ReactNode;
  config: Record<string, unknown> | Record<string, unknown>[];
}

declare global {
  interface Window {
    particlesJS?: (id: string, config: Record<string, unknown>) => void;
  }
}

function ParticlesProvider({ children, config }: ParticlesProviderProps) {
  useEffect(() => {
    // Create multi-particle container if multiple configs
    const multiContainer = document.createElement('div');
    multiContainer.id = 'multi-particles';
    multiContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
      pointer-events: none;
      transition: opacity 0.3s ease-in-out;
      background-color: transparent;
    `;
    document.body.appendChild(multiContainer);

    // Convert single config to array for consistent handling
    const configs = Array.isArray(config) ? config : [config];

    // Create individual particle containers
    const containerIds = configs.map((_, index) => `particles-js-${index}`);
    
    containerIds.forEach((id, index) => {
      const container = document.createElement('div');
      container.id = id;
      container.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        background-color: transparent;
      `;
      multiContainer.appendChild(container);
    });

    // Initialize particles with a delay to ensure DOM and script are ready
    const initParticles = () => {
      if (window.particlesJS) {
        containerIds.forEach((id, index) => {
          window.particlesJS?.(id, configs[index]);
        });
      } else {
        setTimeout(initParticles, 100);
      }
    };

    initParticles();

    // Cleanup
    return () => {
      containerIds.forEach(id => {
        document.getElementById(id)?.remove();
      });
      document.getElementById('multi-particles')?.remove();
    };
  }, [config]); // Re-run when config changes

  return <>{children}</>;
}

export { ParticlesProvider };
