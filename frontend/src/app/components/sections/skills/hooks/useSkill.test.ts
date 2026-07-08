import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import { useSkill } from './useSkill';

describe('useSkill', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('starts with no skill selected', () => {
    const { result } = renderHook(() => useSkill());
    expect(result.current.selectedSkill).toBeNull();
  });

  it('initializes from the ?skill= URL parameter (deep link)', () => {
    window.history.replaceState({}, '', '/?skill=python');
    const { result } = renderHook(() => useSkill());
    expect(result.current.selectedSkill).toBe('python');
  });

  it('writes the selected skill key to the URL', () => {
    const { result } = renderHook(() => useSkill());

    act(() => {
      result.current.setSelectedSkill('apache_spark');
    });

    const params = new URLSearchParams(window.location.search);
    expect(params.get('skill')).toBe('apache_spark');
  });

  it('removes the parameter when the skill is deselected', () => {
    const { result } = renderHook(() => useSkill());

    act(() => {
      result.current.setSelectedSkill('python');
    });
    act(() => {
      result.current.setSelectedSkill(null);
    });

    expect(new URLSearchParams(window.location.search).has('skill')).toBe(false);
  });

  it('preserves the hash fragment when updating the URL', () => {
    window.history.replaceState({}, '', '/#skills');
    const { result } = renderHook(() => useSkill());

    act(() => {
      result.current.setSelectedSkill('python');
    });

    expect(window.location.hash).toBe('#skills');
    expect(new URLSearchParams(window.location.search).get('skill')).toBe('python');
  });

  it('follows browser back/forward navigation', () => {
    const { result } = renderHook(() => useSkill());

    act(() => {
      result.current.setSelectedSkill('python');
    });

    // Simulate the browser going back to a URL without the parameter
    act(() => {
      window.history.replaceState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(result.current.selectedSkill).toBeNull();
  });
});
