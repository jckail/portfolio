import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useUrlParamState } from './use-url-param-state';

describe('useUrlParamState', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('initializes from a deep link', () => {
    window.history.replaceState({}, '', '/?project=jobbr');
    const { result } = renderHook(() => useUrlParamState('project'));
    expect(result.current[0]).toBe('jobbr');
  });

  it('is null when the parameter is absent', () => {
    const { result } = renderHook(() => useUrlParamState('project'));
    expect(result.current[0]).toBeNull();
  });

  it('writes state to the URL, keeps the hash and other params, and removes on null', () => {
    window.history.replaceState({}, '', '/?lang=en#projects');
    const { result } = renderHook(() => useUrlParamState('project'));

    act(() => result.current[1]('jobbr'));
    expect(result.current[0]).toBe('jobbr');
    expect(window.location.search).toBe('?lang=en&project=jobbr');
    expect(window.location.hash).toBe('#projects');

    act(() => result.current[1](null));
    expect(window.location.search).toBe('?lang=en');
    expect(window.location.hash).toBe('#projects');
  });

  it('pushes a history entry per open so Back closes it', () => {
    const before = window.history.length;
    const { result } = renderHook(() => useUrlParamState('skill'));

    act(() => result.current[1]('python'));
    expect(window.history.length).toBe(before + 1);
  });

  it('follows browser back/forward navigation', () => {
    const { result } = renderHook(() => useUrlParamState('skill'));
    act(() => result.current[1]('python'));

    act(() => {
      window.history.replaceState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current[0]).toBeNull();
    expect(window.location.search).toBe('');

    act(() => {
      window.history.replaceState({}, '', '/?skill=react');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current[0]).toBe('react');
  });

  it('stops listening for popstate after unmount', () => {
    const { result, unmount } = renderHook(() => useUrlParamState('skill'));
    unmount();

    window.history.replaceState({}, '', '/?skill=late');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(result.current[0]).toBeNull();
  });

  it('does not touch other parameters when they change under it', () => {
    const { result } = renderHook(() => useUrlParamState('company'));
    act(() => {
      window.history.replaceState({}, '', '/?skill=python');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current[0]).toBeNull();
    expect(window.location.search).toBe('?skill=python');
  });
});
