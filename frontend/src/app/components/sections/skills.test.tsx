import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';

import TechnicalSkills from './skills';

const skill = (display_name: string, general_category: string) => ({
  display_name,
  description: `${display_name} description`,
  years_of_experience: 5,
  professional_experience: true,
  image: '',
  tags: [],
  examples: {},
  weblink: 'https://example.com',
  general_category,
});

const skillsData = {
  python: skill('Python', 'Programming Languages'),
  go: skill('Go', 'Programming Languages'),
  kafka: skill('Kafka', 'Data Engineering'),
};

vi.mock('../../providers/data-provider', () => ({
  useData: () => ({ skillsData, isLoading: false, error: null }),
}));
vi.mock('../../../shared/utils/analytics', () => ({ trackModalView: vi.fn() }));
vi.mock('../../../shared/components/skill-icon/SkillIcon', () => ({ default: () => null }));

beforeEach(() => {
  window.history.replaceState({}, '', '/');
});

afterEach(() => cleanup());

describe('Skills section', () => {
  it('groups skills under a heading per category with a count', () => {
    render(<TechnicalSkills />);
    const heading = screen.getByRole('heading', { name: /Programming Languages/ });
    expect(heading).toHaveTextContent('2');
    const group = heading.parentElement as HTMLElement;
    expect(within(group).getAllByRole('button').map(b => b.getAttribute('aria-label'))).toEqual([
      'View Python details',
      'View Go details',
    ]);
  });

  it('opens a skill from its chip and mirrors it into ?skill=', async () => {
    render(<TechnicalSkills />);
    fireEvent.click(screen.getByRole('button', { name: 'View Kafka details' }));
    expect(new URLSearchParams(window.location.search).get('skill')).toBe('kafka');
    expect(await screen.findByRole('dialog', { name: 'Kafka' })).toBeInTheDocument();
  });

  it('filters by category and reports how many are shown', () => {
    render(<TechnicalSkills />);
    fireEvent.click(screen.getByRole('button', { name: 'Data Engineering' }));
    expect(screen.queryByRole('button', { name: 'View Python details' })).toBeNull();
    expect(screen.getByText(/1 skill shown/)).toBeInTheDocument();
  });
});
