import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getJson, postJson } from '../../shared/utils/api';
import DataPlayground from './data-playground';

import type { Catalog, RunResult } from './types';

vi.mock('../../shared/utils/api', () => ({
  getJson: vi.fn(),
  postJson: vi.fn(),
  endpoints: {
    dataPlayground: '/api/dataplayground',
    dataPlaygroundSimulate: '/api/dataplayground/simulate',
  },
}));
const baseline: RunResult = {
  id: 'baseline-42',
  scenario: { id: 'baseline', name: 'Baseline', description: 'A balanced business.' },
  config: {
    seed: 42,
    days: 30,
    daily_signups: 30,
    activation_rate: 0.65,
    payment_rate: 0.35,
    churn_rate: 0.02,
    duplicate_rate: 0.03,
    invalid_rate: 0.02,
  },
  summary: {
    signups: 100,
    activated_users: 65,
    paying_users: 20,
    active_customers: 18,
    revenue_cents: 12345,
    conversion_rate: 0.2,
    churn_rate: 0.1,
    quality_pass_rate: 0.95,
  },
  daily: [
    {
      date: '2025-01-01',
      signups: 100,
      activations: 65,
      payments: 20,
      churns: 2,
      revenue_cents: 12345,
      active_customers: 18,
    },
  ],
  funnel: [
    { stage: 'Signup', users: 100, rate: 1 },
    { stage: 'Paid', users: 20, rate: 0.2 },
  ],
  cohorts: [{ cohort: '2025-01-01', size: 20, retention: [1, 0.9, null] }],
  pipeline: [
    {
      id: 'validate',
      name: 'Validate',
      input_count: 100,
      output_count: 95,
      rejected_count: 5,
      description: 'Enforce valid events.',
    },
  ],
  quality: [
    {
      id: 'valid',
      name: 'Valid fields',
      status: 'warn',
      checked: 100,
      failed: 5,
      description: 'Check required fields.',
    },
  ],
  events: [
    {
      event_id: 'event-a',
      occurred_at: '2025-01-01',
      user_id: 'alice',
      event_type: 'signup',
      amount_cents: 0,
      channel: 'organic',
      plan: 'basic',
    },
    {
      event_id: 'event-b',
      occurred_at: '2025-01-01',
      user_id: 'bob',
      event_type: 'payment',
      amount_cents: 12345,
      channel: 'paid',
      plan: 'pro',
    },
  ],
  quarantined: [{ event_id: 'bad-a', event_type: 'payment', reason: 'Missing user' }],
  lineage: [
    {
      metric: 'Revenue',
      definition: 'Collected revenue in cents.',
      source: 'accepted_events',
      sql: 'SELECT SUM(amount_cents) FROM events;',
    },
  ],
};
const acquisition = {
  ...baseline,
  id: 'acquisition-42',
  scenario: { id: 'acquisition', name: 'Acquisition', description: 'More signups at the top.' },
  summary: { ...baseline.summary, revenue_cents: 99900 },
};
const catalog: Catalog = {
  schema_version: 1,
  engine_version: '1.0.0',
  source: {
    repository: 'https://github.com/jckail/data_playground',
    command: 'python -m lab export',
  },
  live_simulation: false,
  runs: [baseline, acquisition],
};
beforeEach(() => {
  vi.mocked(getJson).mockReset();
  vi.mocked(postJson).mockReset();
  vi.mocked(getJson).mockResolvedValue(catalog);
});
afterEach(cleanup);

describe('Data Playground', () => {
  it('switches scenarios and preserves the baseline comparison', async () => {
    render(<DataPlayground />);
    fireEvent.click(await screen.findByRole('button', { name: 'Acquisition' }));
    expect(screen.getByText('More signups at the top.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Acquisition' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(
      within(screen.getByRole('region', { name: 'Run metrics compared to baseline' })).getByText(
        '$999.00'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Baseline $123.45')).toBeInTheDocument();
  });
  it('filters the accepted sample and clears an empty result', async () => {
    render(<DataPlayground />);
    const search = await screen.findByRole('searchbox');
    fireEvent.change(screen.getByLabelText('Event type'), { target: { value: 'payment' } });
    expect(screen.getByText('1 of 2 sampled events')).toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'no-such-user' } });
    expect(screen.getByText('No sampled events match these filters.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText('2 of 2 sampled events')).toBeInTheDocument();
  });
  it('retries a failed catalog request', async () => {
    vi.mocked(getJson).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(catalog);
    render(<DataPlayground />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry loading experiments' }));
    expect(await screen.findByText('A balanced business.')).toBeInTheDocument();
    expect(getJson).toHaveBeenCalledTimes(2);
  });
  it('distinguishes censored retention from zero and disables unavailable simulation', async () => {
    render(<DataPlayground />);
    expect(await screen.findByLabelText('Not yet observed')).toHaveTextContent('—');
    expect(screen.getByLabelText('Random seed')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Run simulation' })).not.toBeInTheDocument();
    expect(postJson).not.toHaveBeenCalled();
  });
  it('keeps current results when a custom run fails and can retry', async () => {
    vi.mocked(getJson).mockResolvedValue({ ...catalog, live_simulation: true });
    vi.mocked(postJson)
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(acquisition);
    render(<DataPlayground />);
    await screen.findByText('A balanced business.');
    fireEvent.click(screen.getByText('Inspect parameters & run your own'));
    fireEvent.click(screen.getByRole('button', { name: 'Run simulation' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your current results are preserved'
    );
    expect(screen.getByText('A balanced business.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Run simulation' }));
    expect(await screen.findByText('More signups at the top.')).toBeInTheDocument();
  });
  it('handles an empty catalog', async () => {
    vi.mocked(getJson).mockResolvedValue({ ...catalog, runs: [] });
    render(<DataPlayground />);
    expect(await screen.findByText('No experiments are available yet.')).toBeInTheDocument();
  });
});
