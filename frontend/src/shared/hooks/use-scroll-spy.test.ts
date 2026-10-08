import { act, renderHook, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useScrollSpy } from './use-scroll-spy';
import { scrollToSection } from '../utils/scroll-utils';

vi.mock('../utils/scroll-utils', () => ({ scrollToSection: vi.fn() }));
vi.mock('../utils/analytics', () => ({ trackSectionView: vi.fn(), trackAnchorChange: vi.fn() }));

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  window.history.replaceState(null, '', '/');
  vi.clearAllMocks();
});

function mountSection(id: string) {
  const section = document.createElement('section');
  section.id = id;
  document.body.append(section);
}

describe('lazy section navigation', () => {
  it('resolves a clicked anchor after its lazy section mounts', async () => {
    window.history.replaceState(null, '', '/#about');
    mountSection('about');
    renderHook(() => useScrollSpy());
    vi.mocked(scrollToSection).mockClear();
    act(() => {
      window.history.pushState(null, '', '/#projects');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(scrollToSection).not.toHaveBeenCalled();
    act(() => mountSection('projects'));
    await waitFor(() => expect(scrollToSection).toHaveBeenCalledWith('projects'));
    expect(scrollToSection).toHaveBeenCalledTimes(1);
  });

  it('does not pull a visitor back after they scroll away from a pending target', async () => {
    window.history.replaceState(null, '', '/#projects');
    renderHook(() => useScrollSpy());
    act(() => window.dispatchEvent(new Event('wheel')));
    await act(async () => mountSection('projects'));
    expect(scrollToSection).not.toHaveBeenCalled();
  });

  it('ignores obsolete targets after a second navigation', async () => {
    window.history.replaceState(null, '', '/#projects');
    renderHook(() => useScrollSpy());
    act(() => {
      window.history.pushState(null, '', '/#experience');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await act(async () => mountSection('projects'));
    expect(scrollToSection).not.toHaveBeenCalled();
    act(() => mountSection('experience'));
    await waitFor(() => expect(scrollToSection).toHaveBeenCalledWith('experience'));
  });
});
