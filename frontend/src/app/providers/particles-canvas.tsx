import React, { useEffect, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';

import type { ISourceOptions } from '@tsparticles/engine';

interface ParticlesCanvasProps {
  config: ISourceOptions | ISourceOptions[];
}

/**
 * Renders the tsparticles canvas.
 *
 * Split into its own module so the ~148 kB engine lives in a lazily-loaded
 * chunk instead of the eagerly preloaded graph. Only mounted once the caller
 * has decided particles should actually run.
 */
export default function ParticlesCanvas({ config }: ParticlesCanvasProps) {
  const [init, setInit] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Imported here rather than at module scope so the slim bundle is fetched
    // alongside this chunk, not ahead of it.
    import('@tsparticles/slim')
      .then(({ loadSlim }) => initParticlesEngine((engine) => loadSlim(engine)))
      .then(() => {
        if (!cancelled) setInit(true);
      })
      .catch(() => {
        // A decorative background is never worth surfacing an error for.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!init) return null;

  const configs = Array.isArray(config) ? config : [config];

  return (
    <>
      {configs.map((conf, index) => (
        <Particles key={`particles-${index}`} id={`tsparticles-${index}`} options={conf} />
      ))}
    </>
  );
}
