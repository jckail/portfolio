import React, { useEffect, useState } from 'react';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

import type { ISourceOptions } from "@tsparticles/engine";

import { useMediaQuery } from '../../shared/hooks/use-media-query';

interface ParticlesProviderProps {
  children: React.ReactNode;
  config: ISourceOptions | ISourceOptions[];
}

export function ParticlesProvider({ children, config }: ParticlesProviderProps) {
  const [init, setInit] = useState(false);
  // Skip the animated canvas entirely for users who prefer reduced motion;
  // tsparticles itself pauses when the tab is hidden (pauseOnBlur default).
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  useEffect(() => {
    if (prefersReducedMotion) return;
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, [prefersReducedMotion]);

  if (prefersReducedMotion || !init) {
    return <>{children}</>;
  }

  if (Array.isArray(config)) {
    return (
      <>
        {config.map((conf, index) => (
          <Particles
            key={`particles-${index}`}
            id={`tsparticles-${index}`}
            options={conf}
          />
        ))}
        <div style={{ position: 'relative', zIndex: 2 }}>
          {children}
        </div>
      </>
    );
  }

  return (
    <>
      <Particles
        id="tsparticles"
        options={config}
      />
      <div style={{ position: 'relative', zIndex: 2 }}>
        {children}
      </div>
    </>
  );
}
