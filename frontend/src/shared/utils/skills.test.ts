import { describe, it, expect } from 'vitest';

import { findSkillKey, formatTag } from './skills';

import type { Skill } from '../../app/components/sections/modals/SkillModal';

const skills = {
  pytorch: { display_name: 'PyTorch' },
  apache_spark: { display_name: 'Apache Spark' },
  typescript: { display_name: 'TypeScript' },
} as unknown as Record<string, Skill>;

describe('formatTag', () => {
  it("shows a known skill's display name instead of the lowercase tag", () => {
    // CSS capitalize turned the raw tag into "Pytorch" / "Typescript".
    expect(formatTag('pytorch', skills)).toBe('PyTorch');
    expect(formatTag('apache-spark', skills)).toBe('Apache Spark');
    expect(formatTag('typescript', skills, findSkillKey(skills, 'typescript'))).toBe('TypeScript');
  });

  it('upper-cases acronyms in tags that are not skills', () => {
    expect(formatTag('ai')).toBe('AI');
    expect(formatTag('sql', skills)).toBe('SQL');
    expect(formatTag('ci-cd')).toBe('CI/CD');
    expect(formatTag('data-engineering')).toBe('data engineering');
  });
});
