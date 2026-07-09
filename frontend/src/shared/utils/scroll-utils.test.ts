import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { scrollToSection } from './scroll-utils';

describe('scrollToSection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.documentElement.style.setProperty('--header-height', '80px');
    document.body.innerHTML = '<section id="about"></section>';
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('scrolls the element into view immediately, then adjusts for header height after a delay', () => {
    const element = document.getElementById('about')!;
    const scrollIntoView = vi.fn();
    const scrollTo = vi.fn();
    element.scrollIntoView = scrollIntoView;
    window.scrollTo = scrollTo;

    scrollToSection('about');

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(scrollTo).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('does not throw or call scrollTo if the element is removed before the delayed adjustment fires', () => {
    const element = document.getElementById('about')!;
    element.scrollIntoView = vi.fn();
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;

    scrollToSection('about');
    element.remove();

    expect(() => vi.advanceTimersByTime(100)).not.toThrow();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('does nothing when the target section does not exist', () => {
    expect(() => scrollToSection('does-not-exist')).not.toThrow();
  });
});
