import { describe, it, expect } from 'vitest';

import {
  categoryPosition,
  findSkillKey,
  formatTag,
  relatedSkills,
  resolveTagToSkillKey,
  skillChatPrompt,
  skillSearchText,
  skillUsage,
} from './skills';

import type { Skill, SkillsData } from '../../types/skills';

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

describe('skill relationships', () => {
  const data = {
    python: { display_name: 'Python', general_category: 'Languages', sub_category: 'General', related: ['pytorch', 'nope', 'python', 'pytorch'] },
    pytorch: { display_name: 'PyTorch', general_category: 'AI', sub_category: 'DL', related: [] },
    tensorflow: { display_name: 'TensorFlow', general_category: 'AI', sub_category: 'DL' },
    rag: { display_name: 'RAG', general_category: 'AI', sub_category: 'LLM', tags: [] },
    agent_harnesses: { display_name: 'Agent Harnesses', general_category: 'AI', sub_category: 'Agents' },
  } as unknown as SkillsData;

  it('resolves tags by display name and by key', () => {
    expect(resolveTagToSkillKey(data, 'python')).toBe('python');
    expect(resolveTagToSkillKey(data, 'agent-harnesses')).toBe('agent_harnesses');
    expect(resolveTagToSkillKey(data, 'constructor')).toBeUndefined();
    expect(resolveTagToSkillKey(data, '__proto__')).toBeUndefined();
  });

  it('finds roles and projects whose tech stack names the skill', () => {
    const experienceData = {
      a: { company: 'A', title: 'Eng', date: '2020', tech_stack: ['python', 'agent-harnesses'] },
      b: { company: 'B', title: 'Eng', date: '2019', tech_stack: ['sql'] },
    };
    const projectsData = { p: { title: 'P', tech_stack: ['Python'] }, q: { title: 'Q' } };
    expect(skillUsage(data, 'python', { experienceData, projectsData })).toEqual({
      roles: [{ key: 'a', company: 'A', title: 'Eng', date: '2020' }],
      projects: [{ key: 'p', title: 'P' }],
    });
    expect(skillUsage(data, 'rag', { experienceData, projectsData })).toEqual({ roles: [], projects: [] });
    expect(skillUsage(data, 'rag', {})).toEqual({ roles: [], projects: [] });
  });

  it('uses the related field, dropping unknown, self and duplicate keys', () => {
    expect(relatedSkills(data, 'python')).toEqual(['pytorch']);
  });

  it('falls back to the sub-category when there is no related list', () => {
    expect(relatedSkills(data, 'tensorflow')).toEqual(['pytorch']);
    expect(relatedSkills(data, 'rag')).toEqual([]);
    expect(relatedSkills(data, 'constructor')).toEqual([]);
  });

  it('places a skill among its category in data order', () => {
    expect(categoryPosition(data, 'pytorch')).toEqual({
      category: 'AI', index: 0, total: 4, previous: undefined, next: 'tensorflow',
    });
    expect(categoryPosition(data, 'agent_harnesses')?.next).toBeUndefined();
    expect(categoryPosition(data, 'python')?.total).toBe(1);
    expect(categoryPosition(data, '__proto__')).toBeUndefined();
  });

  it('builds the assistant prompt and search text from the data', () => {
    expect(skillChatPrompt({ display_name: 'Kafka' })).toContain('Kafka');
    const text = skillSearchText(data, {
      display_name: 'Python', description: 'A language', general_category: 'Languages',
      tags: ['data-science'], related: ['pytorch'],
    } as unknown as Skill);
    expect(text).toContain('pytorch');
    expect(text).toContain('data science');
  });
});
