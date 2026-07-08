import { describe, it, expect, beforeEach } from 'vitest';

import { getQueryParam, setQueryParam } from './url-params';

describe('url-params', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('sets and reads a parameter', () => {
    setQueryParam('skill', 'python');
    expect(getQueryParam('skill')).toBe('python');
    expect(window.location.search).toBe('?skill=python');
  });

  it('removes a parameter when value is null', () => {
    setQueryParam('skill', 'python');
    setQueryParam('skill', null);
    expect(getQueryParam('skill')).toBeNull();
    expect(window.location.search).toBe('');
  });

  it('preserves the hash exactly once', () => {
    window.history.replaceState({}, '', '/#about');
    setQueryParam('contact', 'open');
    expect(window.location.hash).toBe('#about');
    expect(window.location.search).toBe('?contact=open');
    expect(window.location.href.match(/#/g)).toHaveLength(1);
  });

  it('keeps other parameters intact', () => {
    setQueryParam('a', '1');
    setQueryParam('b', '2');
    expect(getQueryParam('a')).toBe('1');
    expect(getQueryParam('b')).toBe('2');
  });

  it('supports replace semantics without growing history', () => {
    const initialLength = window.history.length;
    setQueryParam('sidepanel', 'open', { replace: true });
    expect(window.history.length).toBe(initialLength);
    expect(getQueryParam('sidepanel')).toBe('open');
  });
});
