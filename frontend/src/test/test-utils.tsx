import React, { ReactElement } from 'react';
import { render as rtlRender, RenderOptions, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppLogicProvider } from '../app/providers/app-logic-provider';
import { ResumeProvider } from '../features/resume/components/resume-provider';
import { ParticlesProvider } from '../features/theme/components/particles-provider';
import type { ParticlesConfig } from '../features/theme/lib/particles/types';

const updateParticlesConfig = (): ParticlesConfig => ({
  particles: {
    number: {
      value: 80,
      density: {
        enable: true,
        value_area: 800,
      },
    },
    color: {
      value: '#0403ff',
    },
    shape: {
      type: 'circle',
      stroke: {
        width: 0,
        color: '#000000',
      },
    },
    opacity: {
      value: 0.5,
      random: false,
      anim: {
        enable: false,
        speed: 1,
        opacity_min: 0.1,
        sync: false,
      },
    },
    size: {
      value: 3,
      random: true,
      anim: {
        enable: false,
        speed: 40,
        size_min: 0.1,
        sync: false,
      },
    },
    line_linked: {
      enable: true,
      distance: 150,
      color: '#0403ff',
      opacity: 0.4,
      width: 1,
    },
    move: {
      enable: true,
      speed: 6,
      direction: 'none',
      random: false,
      straight: false,
      out_mode: 'out',
      bounce: false,
      attract: {
        enable: false,
        rotateX: 600,
        rotateY: 1200,
      },
    },
  },
  interactivity: {
    detect_on: 'canvas',
    events: {
      onhover: {
        enable: true,
        mode: 'repulse',
      },
      onclick: {
        enable: true,
        mode: 'push',
      },
      resize: true,
    },
    modes: {
      grab: {
        distance: 400,
        line_linked: {
          opacity: 1,
        },
      },
      bubble: {
        distance: 400,
        size: 40,
        duration: 2,
        opacity: 8,
        speed: 3,
      },
      repulse: {
        distance: 200,
        duration: 0.4,
      },
      push: {
        particles_nb: 4,
      },
      remove: {
        particles_nb: 2,
      },
    },
  },
  retina_detect: true,
});

interface WrapperProps {
  children: React.ReactNode;
  initialEntries?: string[];
}

const AllTheProviders = ({ children, initialEntries = ['/'] }: WrapperProps) => {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <AppLogicProvider>
        <ResumeProvider>
          <ParticlesProvider updateParticlesConfig={updateParticlesConfig}>
            {children}
          </ParticlesProvider>
        </ResumeProvider>
      </AppLogicProvider>
    </MemoryRouter>
  );
};

const render = (
  ui: ReactElement,
  { initialEntries = ['/'], ...options }: RenderOptions & { initialEntries?: string[] } = {}
) => rtlRender(ui, { wrapper: (props) => <AllTheProviders {...props} initialEntries={initialEntries} />, ...options });

export { render, screen, fireEvent, waitFor };
