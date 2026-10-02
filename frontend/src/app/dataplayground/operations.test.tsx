import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Operations, flowBands } from './operations';
import { useRuntime } from './use-runtime';

import type { RuntimeState } from './runtime-types';
import type { Catalog } from './types';

vi.mock('./use-runtime', () => ({ useRuntime: vi.fn(), useRunSnapshots: () => null }));
const state: RuntimeState = {
  scenario_id: 'baseline',
  workspace_generation: 1,
  data_revision: 0,
  dag_input_revision: null,
  model_input_revision: null,
  dag_stale: false,
  models_stale: false,
  runtime: 'Local SQLite and event log.',
  source: 'Saved sample',
  expires_in_seconds: 1200,
  tables: [
    {
      name: 'events',
      row_count: 5,
      source: 'Saved accepted sample',
      columns: [{ name: 'event_id', type: 'TEXT', nullable: false, key: 'primary' }],
    },
  ],
  streaming: {
    producer_running: false,
    consumer_paused: true,
    batch_size: 10,
    rate_per_second: 5,
    consumer_batch_size: 100,
    consumer_rate_per_second: 5,
    partitions: [{ partition: 0, produced_offset: 10, consumed_offset: 7, backlog: 3 }],
    produced: 10,
    consumed: 9,
    inserted: 5,
    duplicates: 3,
    quarantined: 1,
    accepted: 5,
    duplicate_rate: 0,
    invalid_rate: 0,
    backlog: 3,
    capacity: 2000,
  },
  dag_trace: [
    { task_id: 'validate', attempt: 1, status: 'failed', detail: 'Permanent failure.' },
    { task_id: 'publish', attempt: 0, status: 'blocked', detail: 'Dependency failed.' },
  ],
  dag_published: false,
  dag_fingerprint: null,
  model_runs: [
    {
      name: 'runtime_daily',
      status: 'success',
      row_count: 2,
      sql: 'SELECT day FROM events;',
      source: 'Runtime transformation',
      tests: [
        {
          name: 'unique_grain',
          status: 'pass',
          failed_rows: 0,
          sql: 'SELECT COUNT(*) FROM runtime_daily;',
        },
      ],
    },
  ],
  logs: [],
  flow: [
    { source: 'producer', target: 'backlog', value: 3 },
    { source: 'producer', target: 'consumed', value: 7 },
    { source: 'consumer_attempts', target: 'inserted', value: 5 },
    { source: 'consumer_attempts', target: 'deduplicated', value: 3 },
    { source: 'consumer_attempts', target: 'quarantined', value: 1 },
  ],
};
const catalog = {
  runs: [{ id: 'baseline', scenario: { id: 'baseline', name: 'Baseline' } }],
} as Catalog;
const action = vi.fn();
const query = vi.fn();
const create = vi.fn();
beforeEach(() => {
  action.mockReset();
  query.mockReset();
  create.mockReset();
  vi.mocked(useRuntime).mockReturnValue({
    session: { token: 'test-token', expires_in_seconds: 1200, state },
    state,
    loading: false,
    error: '',
    action,
    query,
    create,
    refresh: vi.fn(),
    confirm: vi.fn(),
  });
});
afterEach(cleanup);

describe('runtime workbench views', () => {
  it('renders exact flow counts and conserves each boundary independently, including zero outcomes', () => {
    const producer = flowBands(state.flow.filter((link) => link.source === 'producer'));
    expect(producer[0].height / producer[1].height).toBeCloseTo(3 / 7);
    expect(producer.reduce((sum, band) => sum + band.height, 0)).toBeCloseTo(120);
    expect(flowBands([{ source: 'producer', target: 'backlog', value: 0 }])[0].height).toBe(0);
    vi.mocked(useRuntime).mockReturnValue({
      ...useRuntime(),
      state: { ...state, tables: [{ ...state.tables[0], row_count: 37 }] },
    });
    render(<Operations catalog={catalog} view="overview" />);
    expect(screen.getByRole('img', { name: 'Produced records: 10 total' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Consumer attempts: 9 total' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Data movement counts' })).getByText('Quarantined')
    ).toBeInTheDocument();
    const metrics = screen.getByRole('region', { name: 'Workspace metrics' });
    for (const [label, value] of [
      ['Produced records', '10'],
      ['Consumer lag', '3'],
      ['Warehouse event rows', '37'],
      ['Model contracts', '1 / 1 pass'],
    ]) {
      expect(within(metrics).getByText(label).parentElement).toHaveTextContent(value);
    }
  });
  it('does not invent warehouse counts or model test outcomes before they are available', () => {
    vi.mocked(useRuntime).mockReturnValue({
      ...useRuntime(),
      state: { ...state, tables: [], model_runs: [] },
    });
    render(<Operations catalog={catalog} view="overview" />);
    const metrics = screen.getByRole('region', { name: 'Workspace metrics' });
    expect(within(metrics).getByText('Unavailable')).toBeInTheDocument();
    expect(within(metrics).getByText('Not run')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Runtime scope'));
    expect(screen.getByText(state.runtime)).toBeVisible();
  });
  it('requires explicit workspace creation before showing runtime tools', () => {
    vi.mocked(useRuntime).mockReturnValue({ ...useRuntime(), session: null, state: null });
    render(<Operations catalog={catalog} view="operations" />);
    expect(create).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Produce one batch' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create workspace' }));
    expect(create).toHaveBeenCalledWith('baseline');
  });
  it('sends current producer settings and real DAG failure actions and shows trace/model tests', () => {
    render(<Operations catalog={catalog} view="operations" />);
    fireEvent.change(screen.getByLabelText('Batch size'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('Duplicate fraction'), { target: { value: '0.1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Produce one batch' }));
    expect(action).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'produce', batch_size: 20, duplicate_rate: 0.1 })
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'DAG failure injection' }), {
      target: { value: 'permanent' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run workspace DAG' }));
    expect(action).toHaveBeenCalledWith({ action: 'dag_run', failure: 'permanent' });
    expect(
      within(screen.getByRole('region', { name: 'Workspace DAG trace' })).getByText('Not attempted')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText('runtime_daily: success · 2 rows'));
    expect(screen.getByText('unique_grain: pass · 0 failed rows')).toBeInTheDocument();
  });
  it('runs selected SQL with row limits and labels measured time, truncation, and null values', async () => {
    query.mockResolvedValue({
      columns: ['value'],
      rows: [[null]],
      row_count: 1,
      truncated: true,
      elapsed_ms: 1.25,
    });
    render(<Operations catalog={catalog} view="sql" />);
    fireEvent.click(screen.getByRole('button', { name: 'Purchase relationships' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Result row limit' }), {
      target: { value: '25' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run query' }));
    await waitFor(() =>
      expect(query).toHaveBeenCalledWith({
        sql: expect.stringContaining('JOIN shoppers'),
        row_limit: 25,
      })
    );
    expect(await screen.findByRole('status')).toHaveTextContent('1.25 ms measured by the server');
    expect(screen.getByText(/Result truncated/)).toBeInTheDocument();
    expect(screen.getByLabelText('SQL NULL')).toBeInTheDocument();
    fireEvent.click(screen.getByText('events · 5 rows'));
    expect(screen.getByRole('region', { name: 'events schema' })).toHaveTextContent('primary');
  });
  it('shows actual cumulative outcomes and distinguishes retry recovery and stale execution evidence', () => {
    vi.mocked(useRuntime).mockReturnValue({
      ...useRuntime(),
      state: {
        ...state,
        dag_published: true,
        dag_stale: true,
        models_stale: true,
        dag_trace: [
          { task_id: 'analytics', attempt: 1, status: 'failed', detail: 'Transient.' },
          { task_id: 'analytics', attempt: 2, status: 'success', detail: 'Recovered.' },
          { task_id: 'publish', attempt: 1, status: 'success', detail: 'Published.' },
        ],
      },
    });
    render(<Operations catalog={catalog} view="operations" />);
    const outcomes = screen.getByLabelText('Consumer outcomes');
    for (const [label, value] of [
      ['Consumer attempts', '9'],
      ['Inserted', '5'],
      ['Deduplicated', '3'],
      ['Quarantined', '1'],
    ]) {
      expect(within(outcomes).getByText(label).parentElement).toHaveTextContent(value);
    }
    const execution = screen.getByLabelText('Workspace execution outcomes');
    expect(execution).toHaveTextContent(
      'Tasks with failed attempts: analytics · Retried: analytics · Blocked: None'
    );
    expect(execution).toHaveTextContent('DAG evidence is stale');
    expect(execution).toHaveTextContent('Model contracts are stale');
    expect(screen.getByText(/Historical publication evidence/)).toBeInTheDocument();
  });
  it('preserves submitted SQL and row limit when the editor changes, then clears evidence on replacement', async () => {
    query.mockResolvedValue({
      columns: ['event_count'],
      rows: [[5]],
      row_count: 1,
      elapsed_ms: 2,
      truncated: false,
    });
    const view = render(<Operations catalog={catalog} view="sql" />);
    fireEvent.click(screen.getByRole('button', { name: 'Run query' }));
    await screen.findByRole('region', { name: 'SQL query results' });
    fireEvent.click(screen.getByRole('button', { name: 'Purchase relationships' }));
    fireEvent.change(screen.getByLabelText('Result row limit'), { target: { value: '25' } });
    expect(screen.getByText(/The editor or row limit differs/)).toBeInTheDocument();
    expect(
      screen.getByText('SELECT COUNT(*) AS event_count FROM events;', { selector: 'code' })
    ).toBeInTheDocument();
    expect(query).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('Requested limit 100');
    vi.mocked(useRuntime).mockReturnValue({
      ...useRuntime(),
      session: { token: 'replacement', expires_in_seconds: 1200, state },
    });
    view.rerender(<Operations catalog={catalog} view="sql" />);
    expect(screen.queryByRole('region', { name: 'SQL query results' })).not.toBeInTheDocument();
  });
  it('clears SQL evidence on an in-place reset and reports model contracts not run', async () => {
    query.mockResolvedValue({
      columns: ['event_count'],
      rows: [[5]],
      row_count: 1,
      elapsed_ms: 2,
      truncated: false,
    });
    const view = render(<Operations catalog={catalog} view="sql" />);
    fireEvent.click(screen.getByRole('button', { name: 'Run query' }));
    await screen.findByRole('region', { name: 'SQL query results' });
    vi.mocked(useRuntime).mockReturnValue({
      ...useRuntime(),
      state: { ...state, workspace_generation: 2, model_runs: [], dag_trace: [] },
    });
    view.rerender(<Operations catalog={catalog} view="sql" />);
    expect(screen.queryByRole('region', { name: 'SQL query results' })).not.toBeInTheDocument();
    view.rerender(<Operations catalog={catalog} view="operations" />);
    expect(screen.getByLabelText('Workspace execution outcomes')).toHaveTextContent('DAG not run');
    expect(screen.getByLabelText('Workspace execution outcomes')).toHaveTextContent(
      'Model contracts: Not run'
    );
  });
});
