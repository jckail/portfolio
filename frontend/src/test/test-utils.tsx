import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AppLogicProvider } from '@/app/providers/app-logic-provider';
import { ResumeProvider } from '@/features/resume/components/resume-provider';
import { ParticlesProvider } from '@/features/theme/components/particles-provider';
import { particlesConfig } from '@/features/theme/lib/particles';

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const updateParticlesConfig = () => {
    // First cast to unknown, then to Record<string, unknown>
    return JSON.parse(JSON.stringify(particlesConfig)) as Record<string, unknown>;
  };

  return (
    <AppLogicProvider>
      <ResumeProvider>
        <ParticlesProvider updateParticlesConfig={updateParticlesConfig}>
          {children}
        </ParticlesProvider>
      </ResumeProvider>
    </AppLogicProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
