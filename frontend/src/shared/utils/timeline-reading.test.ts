import { describe, expect, it, vi } from 'vitest';

import { readingMilestone } from './timeline-reading';

function item(id: string, top: number, bottom: number) {
  const node = document.createElement('li');
  node.id = id;
  vi.spyOn(node, 'getBoundingClientRect').mockReturnValue({ top, bottom } as DOMRect);
  return node;
}

describe('shared timeline reading selection', () => {
  it('prefers the largest visible overlap over a previous company tail', () => {
    expect(readingMilestone([item('previous', -300, 155), item('current', 175, 625)])).toBe('current');
  });
  it('uses the nearest milestone in a gap instead of retaining different previous state', () => {
    expect(readingMilestone([item('previous', -300, 0), item('next', 360, 700)])).toBe('next');
  });
  it('returns no milestone for an empty timeline', () => {
    expect(readingMilestone([])).toBe('');
  });
});
