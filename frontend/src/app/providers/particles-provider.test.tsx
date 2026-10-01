import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';

import type { ISourceOptions } from '@tsparticles/engine';

const media: Record<string, boolean> = {};
vi.mock('../../shared/hooks/use-media-query', () => ({
  useMediaQuery: (query: string) => media[query] ?? false,
}));
vi.mock('./particles-canvas', () => ({
  default: () => <div data-testid="particles-canvas" />,
}));

import { ParticlesProvider } from './particles-provider';

const visible: ISourceOptions = { particles: { number: { value: 40 } } };
const none: ISourceOptions = { particles: { number: { value: 0 } } };

beforeEach(() => {
  vi.useFakeTimers();
  for (const key of Object.keys(media)) delete media[key];
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ParticlesProvider', () => {
  it('defers the canvas until the browser is idle', async () => {
    render(<ParticlesProvider config={visible}><p>page</p></ParticlesProvider>);
    expect(screen.queryByTestId('particles-canvas')).toBeNull();
    await act(async () => {
      vi.runAllTimers();
    });
    expect(screen.getByTestId('particles-canvas')).toBeInTheDocument();
  });

  it('never mounts the canvas for prefers-reduced-motion', async () => {
    media['(prefers-reduced-motion: reduce)'] = true;
    render(<ParticlesProvider config={visible}><p>page</p></ParticlesProvider>);
    await act(async () => {
      vi.runAllTimers();
    });
    expect(screen.queryByTestId('particles-canvas')).toBeNull();
  });

  it('does not remount the page when the theme config changes', async () => {
    const mounts = vi.fn();
    const Page = () => {
      useEffect(() => {
        mounts();
      }, []);
      return <p>page</p>;
    };

    // light (no particles) -> dark (particles) -> light, as the theme toggle does
    const { rerender } = render(<ParticlesProvider config={none}><Page /></ParticlesProvider>);
    rerender(<ParticlesProvider config={visible}><Page /></ParticlesProvider>);
    await act(async () => {
      vi.runAllTimers();
    });
    expect(screen.getByTestId('particles-canvas')).toBeInTheDocument();
    rerender(<ParticlesProvider config={none}><Page /></ParticlesProvider>);

    expect(screen.queryByTestId('particles-canvas')).toBeNull();
    expect(mounts).toHaveBeenCalledTimes(1);
  });
});
