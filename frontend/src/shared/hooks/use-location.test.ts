import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useLocation } from './use-location';

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('useLocation', () => {
  it('reads the current pathname, search and hash', () => {
    window.history.replaceState(null, '', '/admin?x=1#about');
    window.dispatchEvent(new PopStateEvent('popstate'));
    const { result } = renderHook(() => useLocation());
    expect(result.current).toEqual({ pathname: '/admin', search: '?x=1', hash: '#about' });
  });

  it('updates on popstate and hashchange', () => {
    const { result } = renderHook(() => useLocation());
    act(() => {
      window.history.pushState(null, '', '/#projects');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current.hash).toBe('#projects');

    act(() => {
      window.history.pushState(null, '', '/#skills');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(result.current.hash).toBe('#skills');
  });

  it('ignores replaceState so scroll-spy URL updates do not re-run effects', () => {
    const { result } = renderHook(() => useLocation());
    const before = result.current;
    act(() => {
      window.history.replaceState(null, '', '/#experience');
    });
    expect(result.current).toBe(before);
  });

  it('keeps the same object when an event changes nothing', () => {
    const { result } = renderHook(() => useLocation());
    const before = result.current;
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current).toBe(before);
  });
});
