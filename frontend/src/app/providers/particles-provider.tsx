import React, { useEffect, useState } from 'react';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { Container, ISourceOptions } from "@tsparticles/engine";

interface ParticlesProviderProps {
  children: React.ReactNode;
  config: ISourceOptions | ISourceOptions[];
}

export function ParticlesProvider({ children, config }: ParticlesProviderProps) {
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const particlesLoaded = async (container?: Container) => {
    console.log('Particles container loaded', container);
  };

  if (!init) {
    return <>{children}</>;
  }

  if (Array.isArray(config)) {
    return (
      <>
        {config.map((conf, index) => (
          <Particles
            key={`particles-${index}`}
            id={`tsparticles-${index}`}
            particlesLoaded={particlesLoaded}
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
        particlesLoaded={particlesLoaded}
        options={config}
      />
      <div style={{ position: 'relative', zIndex: 2 }}>
        {children}
      </div>
    </>
  );
}
