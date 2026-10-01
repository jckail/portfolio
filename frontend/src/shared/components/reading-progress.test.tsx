import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';

import ReadingProgress from './reading-progress';

let frames: FrameRequestCallback[] = [];

beforeEach(() => {
  frames = [];
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
    frames.push(cb);
    return frames.length;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 2000 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000 });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
});

const scrollTo = (y: number) => {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: y });
  window.dispatchEvent(new Event('scroll'));
};

const runFrames = () =>
  act(() => {
    const pending = frames;
    frames = [];
    pending.forEach(cb => cb(performance.now()));
  });

describe('ReadingProgress', () => {
  it('coalesces a burst of scroll events into one frame', () => {
    render(<ReadingProgress />);
    scrollTo(100);
    scrollTo(200);
    scrollTo(250);
    expect(frames).toHaveLength(1);

    runFrames();
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '25');
  });

  it('drives the bar with transform: scaleX, not width', () => {
    const { container } = render(<ReadingProgress />);
    scrollTo(500);
    runFrames();
    const fill = container.querySelector<HTMLElement>('.reading-progress-bar')!;
    expect(fill.style.transform).toBe('scaleX(0.5)');
    expect(fill.style.width).toBe('');
  });
});
