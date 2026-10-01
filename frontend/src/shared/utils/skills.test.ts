import { describe, it, expect } from 'vitest';

import { findSkillKey, formatTag } from './skills';

import type { SkillsData } from '../../types/skills';

const skills = {
  pytorch: { display_name: 'PyTorch' },
  apache_spark: { display_name: 'Apache Spark' },
  typescript: { display_name: 'TypeScript' },
} as unknown as SkillsData;

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

describe('prototype-named tags', () => {
  it('formats them as plain words instead of Object.prototype members', () => {
    // TAG_WORDS['constructor'] used to resolve to the Object function and
    // render its source text as the chip label.
    expect(formatTag('constructor')).toBe('constructor');
    expect(formatTag('to-string', skills)).toBe('to string');
    expect(formatTag('__proto__', skills, '__proto__')).toBe('__proto__');
  });

  it('never resolves them to a skill key', () => {
    expect(findSkillKey(skills, 'constructor')).toBeUndefined();
    expect(findSkillKey(skills, '__proto__')).toBeUndefined();
  });
});

describe('findSkillKey', () => {
  it('matches display names case-insensitively and hyphens as spaces', () => {
    expect(findSkillKey(skills, 'Apache-Spark')).toBe('apache_spark');
    expect(findSkillKey(skills, 'TYPESCRIPT')).toBe('typescript');
    expect(findSkillKey(skills, 'rust')).toBeUndefined();
  });

  it('keeps the first key when two skills share a display name', () => {
    const dupes = {
      first: { display_name: 'Spark' },
      second: { display_name: 'spark' },
    } as unknown as SkillsData;
    expect(findSkillKey(dupes, 'spark')).toBe('first');
  });
});
