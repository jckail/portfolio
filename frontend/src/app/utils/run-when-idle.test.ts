import { describe, it, expect, vi, afterEach } from 'vitest';

import { runWhenIdle } from './run-when-idle';

afterEach(() => {
  vi.useRealTimers();
});

describe('runWhenIdle', () => {
  it('runs after the delay once the document has loaded', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    runWhenIdle(callback, { delayMs: 1000 });
    vi.advanceTimersByTime(999);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    // jsdom has no requestIdleCallback, so the timeout path runs it directly
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('never runs once cancelled', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const cancel = runWhenIdle(callback, { delayMs: 10 });
    cancel();
    vi.advanceTimersByTime(100);
    expect(callback).not.toHaveBeenCalled();
  });
});
