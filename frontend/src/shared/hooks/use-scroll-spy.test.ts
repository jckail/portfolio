import { act, renderHook, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useScrollSpy } from './use-scroll-spy';
import { useSectionStore } from '../stores/section-store';
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


describe('career milestone deep links', () => {
  it('resolves a lazy milestone into the experience section without opening a company modal', async () => {
    window.history.replaceState(null, '', '/?theme=dark#experience-meta-facebook');
    renderHook(() => useScrollSpy());
    act(() => {
      mountSection('experience');
      const item = document.createElement('li');
      item.id = 'experience-meta-facebook';
      item.dataset.timelineLabel = 'Meta';
      document.getElementById('experience')?.append(item);
    });
    await waitFor(() => expect(scrollToSection).toHaveBeenCalledWith('experience-meta-facebook'));
    expect(useSectionStore.getState().currentSection).toBe('experience');
    expect(window.location.search).toBe('?theme=dark');
  });
  it('uses the rail reading band for the URL when the previous company still crosses the header threshold', async () => {
    window.history.replaceState({ retained: true }, '', '/?theme=dark#experience');
    mountSection('experience');
    const section = document.getElementById('experience')!;
    vi.spyOn(section, 'getBoundingClientRect').mockReturnValue({ top: 0, bottom: 1200 } as DOMRect);
    for (const [id, top, bottom] of [
      ['experience-sabbatical', -300, 155],
      ['experience-meta-facebook', 175, 625],
    ] as const) {
      const item = document.createElement('li');
      item.id = id;
      item.dataset.timelineLabel = id;
      section.append(item);
      vi.spyOn(item, 'getBoundingClientRect').mockReturnValue({ top, bottom } as DOMRect);
    }
    renderHook(() => useScrollSpy());
    act(() => window.dispatchEvent(new Event('scroll')));
    await waitFor(() => expect(window.location.hash).toBe('#experience-meta-facebook'));
    expect(window.location.search).toBe('?theme=dark');
    expect(window.history.state).toEqual({ retained: true });
  });

  it('restores an existing milestone on Back/Forward while preserving modal query state', async () => {
    window.history.replaceState(null, '', '/?theme=dark&project=portfolio#experience-together-ai');
    mountSection('experience');
    for (const id of ['experience-together-ai', 'experience-meta-facebook']) {
      const item = document.createElement('li'); item.id = id;
      document.getElementById('experience')?.append(item);
    }
    renderHook(() => useScrollSpy());
    vi.mocked(scrollToSection).mockClear();
    act(() => {
      window.history.replaceState(null, '', '/?theme=dark&project=portfolio#experience-meta-facebook');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await waitFor(() => expect(scrollToSection).toHaveBeenCalledWith('experience-meta-facebook'));
    expect(window.location.search).toBe('?theme=dark&project=portfolio');
    expect(useSectionStore.getState().currentSection).toBe('experience');
  });

});
