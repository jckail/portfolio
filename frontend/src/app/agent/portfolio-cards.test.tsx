import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PortfolioCards } from './portfolio-cards';
afterEach(cleanup);

describe('typed dynamic portfolio evidence', () => {
  it('preserves complete resume bullets longer than a skill label', () => {
    const highlight = 'Created the Agent Platform team after establishing data engineering; built agent harnesses and an internal agents factory for production workflows.';
    render(<PortfolioCards cards={[{ kind: 'recruiter_brief', data: {
      profile: { name: 'Jordan Kail' }, experience: [{ title: 'Staff Engineer', highlights: [highlight] }],
    } }]} />);
    expect(screen.getByText(highlight)).toBeInTheDocument();
  });
  it('renders project evidence as text and filters unsafe links', () => {
    render(<PortfolioCards cards={[{ kind: 'project', data: {
      title: '<script>alert(1)</script>', description: 'Published project', technologies: ['Python'],
      links: [{ label: 'unsafe', url: 'javascript:alert(1)' }, { label: 'source', url: 'https://github.com/jckail/portfolio' }],
    } }]} />);
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(screen.queryByRole('link', { name: /unsafe/ })).toBeNull();
    expect(screen.getByRole('link', { name: /source/ })).toHaveAttribute('href', 'https://github.com/jckail/portfolio');
  });
  it('shows actual role snippets and explicit missing evidence', () => {
    render(<PortfolioCards cards={[{ kind: 'role_match', data: { requirements: [
      { requirement: 'Python', status: 'evidence_to_review', evidence: [{ title: 'Meta', snippets: ['Python pipeline evidence'], source: 'experience', key: 'meta' }] },
      { requirement: 'Unknown qualification', status: 'not_published' },
    ] } }]} />);
    expect(screen.getByText('Python pipeline evidence')).toBeInTheDocument();
    expect(screen.getByText(/No published evidence found/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Review portfolio evidence/ })).toHaveAttribute('href', '/?company=meta');
  });
  it('turns a server slot into a review request without booking directly', () => {
    const onPrompt = vi.fn();
    render(<PortfolioCards cards={[{ kind: 'calendar_availability', data: {
      status: 'available', slots: [{ start: '2026-10-15T16:00:00Z', end: '2026-10-15T16:30:00Z' }],
    } }]} onPrompt={onPrompt} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onPrompt).toHaveBeenCalledWith(expect.stringContaining('2026-10-15T16:00:00Z'));
    expect(screen.getByText(/booked only after you review/)).toBeInTheDocument();
  });
  it('shows honest unavailable scheduling and discards malformed cards', () => {
    render(<PortfolioCards cards={[{ kind: 'calendar_availability', data: { status: 'unavailable' } },
      { kind: 'project', data: null }, { kind: 'unknown', data: { title: 'Do not display' } }]} />);
    expect(screen.getByText(/Live calendar scheduling is unavailable/)).toBeInTheDocument();
    expect(screen.queryByText('Do not display')).toBeNull();
  });
});
