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
  kafka: { ...skill('Kafka', 'Data Engineering'), related: ['python'] },
  agents: skill('Agent Harnesses', 'Artificial Intelligence'),
};

vi.mock('../../providers/data-provider', () => ({
  useData: () => ({ skillsData, experienceData: null, projectsData: null, isLoading: false, error: null }),
}));
vi.mock('../../../shared/utils/analytics', () => ({ trackModalView: vi.fn() }));
vi.mock('../../../shared/components/skill-icon/SkillIcon', () => ({ default: () => null }));


function renderCatalogue() {
  const result = render(<TechnicalSkills />);
  fireEvent.click(screen.getByText('Explore the full skills catalogue'));
  // jsdom does not implement the native summary click default action.
  result.container.querySelector('details')?.setAttribute('open', '');
  return result;
}

beforeEach(() => {
  window.history.replaceState({}, '', '/');
});

afterEach(() => cleanup());

describe('Skills section', () => {
  it('groups skills under a heading per category with a count', () => {
    renderCatalogue();
    const heading = screen.getByRole('heading', { name: /Programming Languages/ });
    expect(heading).toHaveTextContent('2');
    const group = heading.parentElement as HTMLElement;
    expect(within(group).getAllByRole('button').map(b => b.getAttribute('aria-label'))).toEqual([
      'View Python details',
      'View Go details',
    ]);
  });

  it('opens a skill from its chip and mirrors it into ?skill=', async () => {
    renderCatalogue();
    fireEvent.click(screen.getByRole('button', { name: 'View Kafka details' }));
    expect(new URLSearchParams(window.location.search).get('skill')).toBe('kafka');
    expect(await screen.findByRole('dialog', { name: 'Kafka' })).toBeInTheDocument();
  });

  it('filters by category and reports how many are shown', () => {
    renderCatalogue();
    fireEvent.click(screen.getByRole('button', { name: 'Data Engineering' }));
    expect(screen.queryByRole('button', { name: 'View Python details' })).toBeNull();
    expect(screen.getByText(/1 skill shown/)).toBeInTheDocument();
  });

  it('marks the active filter as pressed and keeps the status region mounted', () => {
    const { container } = renderCatalogue();
    const status = container.querySelector('.skills-filter-status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toBeEmptyDOMElement();
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');

    const filter = screen.getByRole('button', { name: 'Data Engineering' });
    fireEvent.click(filter);
    expect(filter).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
    expect(container.querySelector('.skills-filter-status')).toBe(status);
    expect(status).toHaveTextContent('1 skill shown');
  });

  it('lists the AI category first', () => {
    renderCatalogue();
    const headings = within(document.querySelector('.skills-grid') as HTMLElement).getAllByRole('heading', { level: 3 }).map(h => h.textContent);
    expect(headings[0]).toMatch(/^Artificial Intelligence/);
  });

  it('matches the names of related skills in search', () => {
    renderCatalogue();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'python' } });
    // Kafka lists Python as related, so it matches alongside Python itself
    expect(screen.getByRole('button', { name: 'View Kafka details' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View Go details' })).toBeNull();
  });

  it('opens a deep-linked skill and ignores a prototype key', async () => {
    window.history.replaceState({}, '', '/?skill=kafka');
    renderCatalogue();
    expect(await screen.findByRole('dialog', { name: 'Kafka' })).toBeInTheDocument();
    cleanup();
    window.history.replaceState({}, '', '/?skill=constructor');
    renderCatalogue();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps ?skill= in step when the dialog moves to another skill', async () => {
    window.history.replaceState({}, '', '/?skill=kafka');
    renderCatalogue();
    const dialog = await screen.findByRole('dialog', { name: 'Kafka' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Python' }));
    await screen.findByRole('dialog', { name: 'Python' });
    expect(new URLSearchParams(window.location.search).get('skill')).toBe('python');
  });
});
