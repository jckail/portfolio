import { describe, it, expect } from 'vitest';

import { findCurrentRole } from './about';

import type { ExperienceItem } from './modals/ExperienceModal';

const item = (company: string, title: string, date: string) =>
  ({ company, title, date }) as ExperienceItem;

describe('findCurrentRole', () => {
  it('headlines the entry that runs to Present', () => {
    const data = {
      old: item('Prove Identity', 'Staff Software Engineer - Data', '06/2023 - 01/2025'),
      now: item('Together AI', 'Staff Software Engineer', '02/2025 - Present'),
    };
    expect(findCurrentRole(data, 'Fallback')).toEqual({
      title: 'Staff Software Engineer',
      company: 'Together AI',
    });
  });

  it('falls back to the contact title without a current entry', () => {
    const data = { old: item('Prove Identity', 'Engineer', '06/2023 - 01/2025') };
    expect(findCurrentRole(data, 'Staff Software Engineer')).toEqual({ title: 'Staff Software Engineer' });
  });

  it('returns null with nothing to show', () => {
    expect(findCurrentRole(null)).toBeNull();
  });
});
