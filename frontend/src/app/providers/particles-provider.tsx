import React, { Suspense, lazy } from 'react';

import type { ISourceOptions } from "@tsparticles/engine";

import { useMediaQuery } from '../../shared/hooks/use-media-query';

// Engine + canvas live in a separate chunk; nothing here pulls tsparticles
// into the initial bundle.
const ParticlesCanvas = lazy(() => import('./particles-canvas'));

interface ParticlesProviderProps {
  children: React.ReactNode;
  config: ISourceOptions | ISourceOptions[];
}

/** Whether a config would actually draw anything. */
function hasVisibleParticles(config: ISourceOptions | ISourceOptions[]): boolean {
  const configs = Array.isArray(config) ? config : [config];
  return configs.some((conf) => {
    const count = conf?.particles?.number?.value;
    return typeof count === 'number' ? count > 0 : true;
  });
}

export function ParticlesProvider({ children, config }: ParticlesProviderProps) {
  // Skip the animated canvas entirely for users who prefer reduced motion;
  // tsparticles itself pauses when the tab is hidden (pauseOnBlur default).
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  // A full-viewport animated canvas is a poor trade on phone GPUs, where the
  // decorative payoff is smallest and the battery cost is highest.
  const isSmallViewport = useMediaQuery('(max-width: 768px)');

  // The light theme configures zero particles, so the engine would download,
  // initialise and mount a canvas purely to draw nothing.
  const shouldRender =
    !prefersReducedMotion && !isSmallViewport && hasVisibleParticles(config);

  if (!shouldRender) {
    return <>{children}</>;
  }

  return (
    <>
      <Suspense fallback={null}>
        <ParticlesCanvas config={config} />
      </Suspense>
      <div style={{ position: 'relative', zIndex: 2 }}>
        {children}
      </div>
    </>
  );
}
