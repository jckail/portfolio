import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { EvidencePanel } from './evidence-panel';

import type { PortfolioEvidence } from './public-evidence';

afterEach(cleanup);
const evidence: PortfolioEvidence = {
  profile: { name: 'Jordan Kail', title: 'Staff Software Engineer', location: 'San Francisco, CA', github: '', linkedin: '' },
  experience: [
    { id: 'together_ai', company: 'Together AI', title: 'Agents Platform', date: '2025–Present', highlights: ['Built an agent platform.'] },
    { id: 'prove', company: 'Prove Identity', title: 'Staff Software Engineer', date: '2023–2025', highlights: ['Built model governance.'] },
    { id: 'sabbatical', company: 'Sabbatical', title: 'Digital nomad experiment', date: '2022–2023', highlights: ['Explored the world.'] },
    { id: 'meta', company: 'Meta', title: 'Software Engineer', date: '2020–2022', highlights: ['Built AI classifiers.'] },
  ],
  projects: [{ id: 'jobbr', title: 'Jobbr', description: 'Job search tools', url: 'https://jobdog.ai/jobbr/#/', technologies: [] }],
  skillGroups: [{ name: 'Languages', items: ['Python', 'Go'] }],
};

describe('scannable public evidence', () => {
  it('prioritizes recent engineering roles while retaining a complete portfolio link', () => {
    render(<EvidencePanel evidence={evidence} />);
    expect(screen.getByText('Together AI')).toBeInTheDocument();
    expect(screen.getByText('Prove Identity')).toBeInTheDocument();
    expect(screen.getByText('Meta')).toBeInTheDocument();
    expect(screen.queryByText('Sabbatical')).toBeNull();
    expect(screen.getByRole('link', { name: 'Explore the complete portfolio ↗' })).toHaveAttribute('href', '/#experience');
  });
  it('keeps source facts and project links available within collapsed disclosures', () => {
    render(<EvidencePanel evidence={evidence} />);
    expect(screen.getByText('Built AI classifiers.').closest('details')).not.toHaveAttribute('open');
    expect(screen.getByRole('link', { name: 'Project source ↗' })).toHaveAttribute('href', 'https://jobdog.ai/jobbr/#/');
    expect(screen.getByText('Python · Go')).toBeInTheDocument();
  });
  it('never renders unsafe external project URLs', () => {
    render(<EvidencePanel evidence={{ ...evidence, projects: [{ ...evidence.projects[0], url: 'javascript:alert(1)' }] }} />);
    expect(screen.queryByRole('link', { name: 'Project source ↗' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Jobbr' })).toHaveAttribute('href', '/?project=jobbr#projects');
  });
});
