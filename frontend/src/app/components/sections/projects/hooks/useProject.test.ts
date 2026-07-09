import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import { useProject } from './useProject';

describe('useProject', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('starts with no selected project', () => {
    const { result } = renderHook(() => useProject());
    expect(result.current.selectedProject).toBeNull();
  });

  it('opens from ?project= deep link', () => {
    window.history.replaceState({}, '', '/?project=super_teacher');
    const { result } = renderHook(() => useProject());
    expect(result.current.selectedProject).toBe('super_teacher');
  });

  it('syncs selection to the URL', () => {
    const { result } = renderHook(() => useProject());

    act(() => {
      result.current.setSelectedProject('jobbr');
    });
    expect(new URLSearchParams(window.location.search).get('project')).toBe('jobbr');

    act(() => {
      result.current.setSelectedProject(null);
    });
    expect(new URLSearchParams(window.location.search).has('project')).toBe(false);
  });
});
