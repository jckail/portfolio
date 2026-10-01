import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { scrollToSection } from './scroll-utils';

describe('scrollToSection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<section id="about"></section>';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('scrolls once with scrollIntoView and never issues a second correcting scroll', () => {
    const element = document.getElementById('about')!;
    const scrollIntoView = vi.fn();
    const scrollTo = vi.fn();
    element.scrollIntoView = scrollIntoView;
    window.scrollTo = scrollTo;

    scrollToSection('about');
    vi.advanceTimersByTime(1000);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('jumps instead of animating when the visitor prefers reduced motion', () => {
    const element = document.getElementById('about')!;
    const scrollIntoView = vi.fn();
    element.scrollIntoView = scrollIntoView;
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({ matches: query.includes('reduce'), media: query }) as MediaQueryList
    );

    scrollToSection('about');

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
  });

  it('does nothing when the target section does not exist', () => {
    expect(() => scrollToSection('does-not-exist')).not.toThrow();
  });
});
