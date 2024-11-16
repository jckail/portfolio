import React, { useEffect } from 'react';
import type { ParticlesConfig } from '../../types/particles';

interface ParticlesProviderProps {
  children: React.ReactNode;
  config: Record<string, unknown> | Record<string, unknown>[];
  isResumeLoaded?: boolean;
}

declare global {
  interface Window {
    particlesJS?: (id: string, config: Record<string, unknown>) => void;
  }
}

function ParticlesProvider({ children, config, isResumeLoaded = false }: ParticlesProviderProps) {
  useEffect(() => {
    if (!isResumeLoaded) return;

    // Create multi-particle container
    const multiContainer = document.createElement('div');
    multiContainer.id = 'multi-particles';
    multiContainer.style.cssText = `
      position: absolute !important;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      min-height: 100%;
      z-index: 1;
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
        position: absolute !important;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        min-height: 100%;
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

    // Ensure body has relative positioning and minimum height
    document.body.style.position = 'relative';
    document.body.style.minHeight = '100vh';

    // Cleanup
    return () => {
      containerIds.forEach(id => {
        document.getElementById(id)?.remove();
      });
      document.getElementById('multi-particles')?.remove();
    };
  }, [config, isResumeLoaded]);

  return (
    <div style={{ position: 'relative', zIndex: 2 }}>
      {children}
    </div>
  );
}

export { ParticlesProvider };
