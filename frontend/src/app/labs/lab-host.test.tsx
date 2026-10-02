import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getJson } from '../../shared/utils/api';
import { findLabLoader, LabHost, slugFromModulePath } from './lab-host';
import { FALLBACK_NOTICE, LabShell, labEndpoint } from './lab-shell';

import type { LabInfo } from './lab-shell';

vi.mock('../../shared/utils/api', () => ({
  getJson: vi.fn(),
  endpoints: { labs: '/api/labs' },
}));

const info: LabInfo = {
  slug: 'demo',
  project_key: 'ai_billing',
  title: 'Demo Lab',
  description: 'A demo.',
  intro: ['Intro.'],
  features: ['a', 'b', 'c'],
  repo: 'https://github.com/jckail/demo',
  demo_notice: 'Synthetic data, runs entirely in your browser.',
  updated: '2026-09-30',
};

beforeEach(() => {
  vi.mocked(getJson).mockReset();
});
afterEach(() => cleanup());

describe('module discovery', () => {
  it('maps lab module paths to slugs', () => {
    expect(slugFromModulePath('./aibilling/lab.tsx')).toBe('aibilling');
    expect(slugFromModulePath('./aibilling/other.tsx')).toBeNull();
    expect(slugFromModulePath('./lab-host.tsx')).toBeNull();
  });

  it('finds the loader for a slug, and none for an unknown one', () => {
    const loader = async () => ({ default: () => null });
    const modules = { './demo/lab.tsx': loader, './other/lab.tsx': async () => ({ default: () => null }) };
    expect(findLabLoader('demo', modules)).toBe(loader);
    expect(findLabLoader('nope', modules)).toBeNull();
    expect(findLabLoader('constructor', modules)).toBeNull();
  });

  it('builds the encoded endpoint', () => {
    expect(labEndpoint('demo')).toBe('/api/labs/demo');
    expect(labEndpoint('a/b')).toBe('/api/labs/a%2Fb');
  });
});

describe('LabShell', () => {
  it('wraps the lab with skip link, back link, notice and repo link', () => {
    render(
      <LabShell slug="demo" info={info}>
        <main>
          <h1>Lab</h1>
        </main>
      </LabShell>
    );
    expect(screen.getByRole('link', { name: 'Skip to demo' })).toHaveAttribute('href', '#lab-shell-content');
    expect(screen.getByRole('link', { name: /Back to portfolio/ })).toHaveAttribute('href', '/');
    expect(screen.getByRole('heading', { level: 1, name: 'Lab' })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(info.demo_notice);
    expect(screen.getByRole('link', { name: 'Source code on GitHub' })).toHaveAttribute('href', info.repo);
    expect(document.getElementById('lab-shell-content')).toHaveAttribute('tabindex', '-1');
  });

  it('still states the synthetic-data notice when the record is unavailable', () => {
    render(
      <LabShell slug="demo" info={false}>
        <p>x</p>
      </LabShell>
    );
    expect(screen.getByRole('note')).toHaveTextContent(FALLBACK_NOTICE);
    expect(screen.queryByRole('link', { name: 'Source code on GitHub' })).toBeNull();
  });
});

describe('LabHost without a lab module', () => {
  it('shows the site 404 for a slug the server does not know', async () => {
    vi.mocked(getJson).mockRejectedValue(new Error('404'));
    render(<LabHost slug="missing" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByText('/missing')).toBeInTheDocument();
    expect(getJson).toHaveBeenCalledWith('/api/labs/missing');
  });

  it('shows a coming-soon view when the server knows the slug but the build has no lab', async () => {
    vi.mocked(getJson).mockResolvedValue(info);
    render(<LabHost slug="demo" />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Demo Lab' })).toBeInTheDocument();
    expect(screen.getByText(/not available in this build yet/)).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Demo Lab | Jordan Kail'));
    expect(screen.getByRole('link', { name: 'Back to the portfolio' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Source code on GitHub' })).toHaveAttribute('href', info.repo);
  });
});
