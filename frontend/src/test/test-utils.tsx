import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AppLogicProvider } from '../app/providers/app-logic-provider';
import { ResumeProvider } from '../features/content/components/resume-provider';
import { ParticlesProvider } from '../features/content/components/particles-provider';
import getParticlesConfig from '../features/content/lib/particles/config';
import { PRIMARY } from '../config/constants';

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  // Use light theme config for testing
  const config = getParticlesConfig({
    particleColor: PRIMARY,
    lineColor: PRIMARY,
    backgroundColor: '#ffffff' // Added required backgroundColor property
  });

  // Use JSON parse/stringify to ensure a clean object for testing
  const testConfig = JSON.parse(JSON.stringify(config)) as Record<string, unknown>;

  return (
    <AppLogicProvider>
      <ResumeProvider>
        <ParticlesProvider config={testConfig}>
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
