import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import TechnicalSkills from './skills';
import Projects from './projects';

// Plain objects: the sections must check own keys themselves, not rely only
// on the DataProvider handing them null-prototype copies.
const skillsData = {
  python: {
    display_name: 'Python',
    description: 'A language',
    years_of_experience: 10,
    professional_experience: true,
    image: '',
    tags: [],
    examples: {},
    weblink: 'https://python.org',
    general_category: 'Programming Languages',
  },
};
const projectsData = {
  portfolio: { title: 'Portfolio', description: 'Site', description_detail: '', link: 'https://example.com' },
};

vi.mock('../../providers/data-provider', () => ({
  useData: () => ({ skillsData, projectsData, isLoading: false, error: null }),
}));
vi.mock('../../../shared/utils/analytics', () => ({ trackModalView: vi.fn() }));
vi.mock('../../../shared/components/skill-icon/SkillIcon', () => ({ default: () => null }));
vi.mock('../../../shared/components/project-icon/ProjectIcon', () => ({ default: () => null }));

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

beforeEach(() => window.history.replaceState({}, '', '/'));
afterEach(() => cleanup());

describe('prototype keys in deep links', () => {
  it.each(['__proto__', 'constructor', 'hasOwnProperty'])('?skill=%s opens nothing', async key => {
    window.history.replaceState({}, '', `/?skill=${encodeURIComponent(key)}`);
    render(<TechnicalSkills />);
    await flush();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it.each(['__proto__', 'constructor', 'hasOwnProperty'])('?project=%s opens nothing', async key => {
    window.history.replaceState({}, '', `/?project=${encodeURIComponent(key)}`);
    render(<Projects />);
    await flush();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('still opens real keys', async () => {
    window.history.replaceState({}, '', '/?skill=python');
    render(<TechnicalSkills />);
    expect(await screen.findByRole('dialog', { name: 'Python' })).toBeInTheDocument();
    cleanup();

    window.history.replaceState({}, '', '/?project=portfolio');
    render(<Projects />);
    expect(await screen.findByRole('dialog', { name: 'Portfolio' })).toBeInTheDocument();
  });
});
