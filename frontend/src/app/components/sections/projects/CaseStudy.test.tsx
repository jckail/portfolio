import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CaseStudy } from './CaseStudy';

describe('CaseStudy', () => {
  it('shows decisions, limitations and source links without inventing missing sections', () => {
    render(<CaseStudy study={{ problem: 'Count usage reliably', decisions: [{ decision: 'Atomic reservations', tradeoff: 'Database availability gates inference', evidence_url: 'https://example.com/source' }], outcomes: [{ statement: 'Parallel reservations stay within the cap', source_url: 'https://example.com/test' }], limitations: ['Synthetic verification only'] }} />);
    expect(screen.getByRole('heading', { name: 'Decisions and tradeoffs' })).toBeInTheDocument();
    expect(screen.getByText('Database availability gates inference')).toBeInTheDocument();
    expect(screen.getByText('Synthetic verification only')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Outcome source' })).toHaveAttribute('href', 'https://example.com/test');
    expect(screen.queryByRole('heading', { name: 'Architecture' })).toBeNull();
  });

  it('renders architecture, role, challenges and authored evidence', () => {
    render(<CaseStudy study={{ role: 'Designed the service', architecture: 'Browser → API → database', constraints: ['No public writes'], challenges: [{ challenge: 'Concurrent calls', resolution: 'Row-level locking' }], evidence_links: [{ label: 'Source code', url: 'https://example.com/repo' }] }} />);
    expect(screen.getByText('Browser → API → database')).toBeInTheDocument();
    expect(screen.getByText('Row-level locking')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Source code' })).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('does not render unsafe evidence URLs', () => {
    render(<CaseStudy study={{ evidence_links: [{ label: 'Unsafe', url: 'javascript:alert(1)' }] }} />);
    expect(screen.queryByRole('link')).toBeNull();
  });
});
