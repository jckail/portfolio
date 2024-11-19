import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ResumeProvider } from '../app/providers/resume-provider';
import { ParticlesProvider } from '../app/providers/particles-provider';
import { getThemeConfig } from '../shared/utils/theme/get-theme-config';
import { PRIMARY } from '../config/constants';

const testConfig = getThemeConfig('light');

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      <ResumeProvider>
        <ParticlesProvider config={testConfig}>
          {children}
        </ParticlesProvider>
      </ResumeProvider>
    </BrowserRouter>
  );
};

const customRender = (ui: React.ReactElement, options = {}) =>
  render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
