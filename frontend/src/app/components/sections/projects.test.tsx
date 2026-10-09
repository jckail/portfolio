import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Projects from './projects';

import type { ProjectsData } from '../../../types/resume';

const projectsData: ProjectsData = {
  portfolio: {
    title: 'Portfolio',
    description: 'A personal site',
    description_detail: '',
    categories: ['agents'],
    tech_stack: ['python'],
    featured: true,
    link: 'https://example.com',
    // Not an inline icon: renders the <img> fallback, no SVG import
    logoPath: 'test-icon.svg',
  },
};

vi.mock('../../providers/data-provider', () => ({
  useData: () => ({ skillsData: { python: { display_name: 'Python', image: '', professional_experience: true, years_of_experience: 10, tags: [], description: 'Programming language', weblink: 'https://python.org', examples: {}, general_category: 'Languages' } }, projectsData, isLoading: false, error: null }),
}));
vi.mock('../../../shared/utils/analytics', () => ({ trackModalView: vi.fn() }));
vi.mock('../../../shared/components/skill-icon/SkillIcon', () => ({ default: () => null }));

beforeEach(() => {
  window.history.replaceState({}, '', '/');
  delete projectsData.data;
});
afterEach(() => cleanup());

describe('project card button', () => {
  it('has an accessible name that starts with its visible text', () => {
    const { container } = render(<Projects />);
    const card = container.querySelector('.project-card-main');
    expect(card).not.toBeNull();
    expect(card).toHaveAttribute('role', 'button');
    expect(card).toHaveAttribute('tabindex', '0');
    // No aria-label: the name is the visible title + description, then a
    // visually hidden suffix (Lighthouse label-content-name-mismatch).
    expect(card).not.toHaveAttribute('aria-label');
    const button = within(container.querySelector('.project-catalogue') as HTMLElement).getByRole('button', { name: /^Portfolio\s*A personal site\s*\(view details\)$/ });
    expect(button).toBe(card);
    expect(card?.querySelector('.project-icon')).toHaveAttribute('aria-hidden', 'true');
  });

  it('opens the project from the keyboard', async () => {
    const { container } = render(<Projects />);
    fireEvent.keyDown(container.querySelector('.project-card-main') as Element, { key: 'Enter' });
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});


describe('project catalogue', () => {
  it('defaults to featured and replaces cards as tabs change without duplicates', () => {
    projectsData.data = { title: 'Data service', description: 'Metered events', description_detail: '', link: 'https://example.com/data', categories: ['data'] };
    render(<Projects />);
    expect(screen.getByRole('tab', { name: 'Featured' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByRole('heading', { name: 'Portfolio' })).toHaveLength(1);
    expect(screen.queryByRole('heading', { name: 'Data service' })).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Data and reliability' }));
    expect(screen.getByRole('tabpanel', { name: 'Data and reliability' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Data service' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Portfolio' })).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('1 of 2 projects');
    fireEvent.click(screen.getByRole('tab', { name: 'All projects' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
    fireEvent.click(screen.getByRole('tab', { name: 'Featured' }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });

  it('supports arrow, Home and End keys with one tab stop', () => {
    render(<Projects />);
    const featured = screen.getByRole('tab', { name: 'Featured' });
    featured.focus();
    fireEvent.keyDown(featured, { key: 'ArrowRight' });
    const all = screen.getByRole('tab', { name: 'All projects' });
    expect(all).toHaveFocus();
    expect(all).toHaveAttribute('aria-selected', 'true');
    expect(featured).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(all, { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Open source and experiments' })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(featured).toHaveFocus();
    fireEvent.keyDown(featured, { key: 'ArrowLeft' });
    fireEvent.keyDown(document.activeElement!, { key: 'Home' });
    expect(featured).toHaveFocus();
  });

  it('offers a reset for an empty category', () => {
    render(<Projects />);
    fireEvent.click(screen.getByRole('tab', { name: 'Infrastructure' }));
    expect(screen.getByRole('status')).toHaveTextContent('0 of 1 projects');
    fireEvent.click(screen.getByRole('button', { name: 'Show all projects' }));
    expect(screen.getByRole('tab', { name: 'All projects' })).toHaveAttribute('aria-selected', 'true');
  });

  it('opens a deep-linked project even when excluded by the active filter', async () => {
    render(<Projects />);
    fireEvent.click(screen.getByRole('tab', { name: 'Infrastructure' }));
    act(() => {
      window.history.pushState({}, '', '/?project=portfolio#projects');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(await screen.findByRole('dialog')).toHaveTextContent('Portfolio');
    expect(screen.getByRole('tab', { name: 'Infrastructure' })).toHaveAttribute('aria-selected', 'true');
  });
});


describe('project skill focus restoration', () => {
  it('returns to the catalogue panel after a hidden deep-linked project opens a skill', async () => {
    projectsData.data = { title: 'Data service', description: 'Metered events', description_detail: '', link: 'https://example.com/data', categories: ['data'], tech_stack: ['python'] };
    window.history.replaceState({}, '', '/?project=data#projects');
    const user = userEvent.setup();
    render(<Projects />);
    const projectDialog = await screen.findByRole('dialog');
    expect(projectDialog).toHaveTextContent('Data service');
    await act(async () => { await user.click(within(projectDialog).getByRole('button', { name: 'Python' })); });
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('Programming language'));
    await act(async () => { await user.keyboard('{Escape}'); });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(screen.getByRole('tabpanel', { name: 'Featured' })).toHaveFocus());
  });

  it.each(['Featured', 'All projects'])('returns to the originating card in %s after a project-to-skill transition', async (tab) => {
    const user = userEvent.setup();
    const { container } = render(<Projects />);
    fireEvent.click(screen.getByRole('tab', { name: tab }));
    const trigger = within(container.querySelector('.project-catalogue') as HTMLElement).getByRole('button', { name: 'View details' });
    await act(async () => { await user.click(trigger); });
    const projectDialog = await screen.findByRole('dialog');
    await act(async () => { await user.click(within(projectDialog).getByRole('button', { name: 'Python' })); });
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('Programming language'));
    await act(async () => { await user.keyboard('{Escape}'); });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
