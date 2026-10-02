import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDeepLink } from './use-deep-link';

const scrollToSection = vi.hoisted(() => vi.fn());
vi.mock('../utils/scroll-utils', () => ({ scrollToSection }));

type Options = Parameters<typeof useDeepLink>[0];

function setup(overrides: Partial<Options> = {}) {
  const clear = vi.fn();
  const initial: Options = {
    param: 'project',
    value: 'jobbr',
    ready: true,
    valid: true,
    sectionId: 'projects',
    clear,
    ...overrides,
  };
  const hook = renderHook((props: Options) => useDeepLink(props), { initialProps: initial });
  return { ...hook, clear, initial };
}

describe('useDeepLink', () => {
  beforeEach(() => {
    scrollToSection.mockReset();
    window.history.replaceState({}, '', '/?project=jobbr');
  });

  it('scrolls to the section once a valid deep link is ready', () => {
    const { clear } = setup();
    expect(scrollToSection).toHaveBeenCalledExactlyOnceWith('projects');
    expect(clear).not.toHaveBeenCalled();
    expect(window.location.search).toBe('?project=jobbr');
  });

  it('waits for data before acting', () => {
    const { rerender, initial } = setup({ ready: false });
    expect(scrollToSection).not.toHaveBeenCalled();

    rerender({ ...initial, ready: true });
    expect(scrollToSection).toHaveBeenCalledExactlyOnceWith('projects');
  });

  it('drops an unresolvable link by replacing history, and clears state', () => {
    const before = window.history.length;
    const { clear } = setup({ value: 'nope', valid: false });
    expect(scrollToSection).not.toHaveBeenCalled();
    expect(clear).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe('');
    expect(window.history.length).toBe(before);
  });

  it('removes the dead parameter from the URL but keeps the rest', () => {
    window.history.replaceState({}, '', '/?project=nope&lang=en#projects');
    setup({ value: 'nope', valid: false });
    expect(window.location.search).toBe('?lang=en');
    expect(window.location.hash).toBe('#projects');
  });

  it('does nothing when there was no deep link', () => {
    const { clear } = setup({ value: null, valid: false });
    expect(scrollToSection).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
  });

  it('handles the deep link only once; later opens are left alone', () => {
    const { rerender, clear, initial } = setup();
    expect(scrollToSection).toHaveBeenCalledTimes(1);

    // A user later clicks another project: not a deep link
    rerender({ ...initial, value: 'other', valid: false });
    rerender({ ...initial, value: 'third', valid: true });
    expect(scrollToSection).toHaveBeenCalledTimes(1);
    expect(clear).not.toHaveBeenCalled();
  });

  it('does not treat a null value on first ready as consuming a later real link', () => {
    // Once ready with no link, the hook is spent: a later value is a click, not a deep link
    const { rerender, initial } = setup({ value: null, valid: false });
    rerender({ ...initial, value: 'jobbr', valid: true });
    expect(scrollToSection).not.toHaveBeenCalled();
  });
});
