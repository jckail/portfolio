import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RunComparison } from './run-comparison';
import { createRunSnapshot } from './run-snapshots';
import { useRunSnapshots, useRuntime } from './use-runtime';

import type { RuntimeState } from './runtime-types';

vi.mock('./use-runtime', () => ({ useRunSnapshots: vi.fn(), useRuntime: vi.fn() }));
const state: RuntimeState = {
  scenario_id: 'baseline',
  workspace_generation: 1,
  data_revision: 0,
  runtime: 'private runtime details',
  source: 'private source details',
  expires_in_seconds: 1200,
  tables: [{ name: 'events', row_count: 80, source: 'private source', columns: [] }],
  streaming: {
    producer_running: false,
    consumer_paused: true,
    batch_size: 10,
    rate_per_second: 5,
    consumer_batch_size: 100,
    consumer_rate_per_second: 5,
    partitions: [{ partition: 0, produced_offset: 3, consumed_offset: 0, backlog: 3 }],
    produced: 3,
    consumed: 0,
    inserted: 0,
    duplicates: 0,
    quarantined: 0,
    accepted: 0,
    duplicate_rate: 0,
    invalid_rate: 0,
    backlog: 3,
    capacity: 2000,
  },
  dag_trace: [],
  dag_published: false,
  dag_fingerprint: null,
  model_runs: [],
  logs: [],
  flow: [],
};
const before = createRunSnapshot(state, 'Before', {
  id: 'before',
  capturedAt: '2026-10-02T00:00:00Z',
});
const after = createRunSnapshot(
  {
    ...state,
    data_revision: 10,
    tables: [{ ...state.tables[0], row_count: 90 }],
    streaming: {
      ...state.streaming,
      consumed: 13,
      produced: 13,
      inserted: 10,
      duplicates: 3,
      backlog: 0,
      consumer_paused: false,
    },
    dag_trace: [{ task_id: 'publish', attempt: 1, status: 'success', detail: 'private detail' }],
    dag_published: true,
    dag_fingerprint: 'a'.repeat(64),
    dag_input_revision: 10,
    model_input_revision: 10,
    dag_stale: true,
    models_stale: false,
    model_runs: [
      {
        name: 'runtime_daily',
        row_count: 2,
        source: 'private source',
        sql: 'private SQL',
        status: 'success',
        tests: [{ name: 'grain', status: 'pass', failed_rows: 0, sql: 'private test SQL' }],
      },
    ],
  },
  'After',
  { id: 'after', capturedAt: '2026-10-02T00:00:01Z' }
);
const capture = vi.fn();
const remove = vi.fn();
const clear = vi.fn();
beforeEach(() => {
  vi.mocked(useRuntime).mockReturnValue({ loading: false } as ReturnType<typeof useRuntime>);
  vi.mocked(useRunSnapshots).mockReturnValue({ snapshots: [], capture, remove, clear });
  capture.mockReset();
  remove.mockReset();
  clear.mockReset();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function selectPair() {
  fireEvent.change(screen.getByLabelText('Before snapshot', { exact: true }), {
    target: { value: 'before' },
  });
  fireEvent.change(screen.getByLabelText('After snapshot', { exact: true }), {
    target: { value: 'after' },
  });
}

describe('observed-state comparison', () => {
  it('requires a bounded explicit name and never captures automatically', () => {
    capture.mockReturnValue(true);
    render(<RunComparison />);
    expect(screen.getByText('No snapshots captured in this workspace.')).toBeInTheDocument();
    expect(capture).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Capture snapshot' })).toBeDisabled();
    expect(screen.getByLabelText('Snapshot name')).toHaveAttribute('maxlength', '60');
    fireEvent.change(screen.getByLabelText('Snapshot name'), { target: { value: 'Observed lag' } });
    fireEvent.click(screen.getByRole('button', { name: 'Capture snapshot' }));
    expect(capture).toHaveBeenCalledWith('Observed lag');
    expect(screen.getByRole('status')).toHaveTextContent('Captured Observed lag');
    expect(screen.getByLabelText('Snapshot name')).toHaveFocus();
  });
  it('compares explicit distinct selections with signed counts, actual controls, missing model evidence and freshness', () => {
    vi.mocked(useRunSnapshots).mockReturnValue({
      snapshots: [before, after],
      capture,
      remove,
      clear,
    });
    render(<RunComparison />);
    expect(
      screen.queryByRole('region', { name: 'Snapshot counter differences' })
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Before snapshot', { exact: true }), {
      target: { value: 'before' },
    });
    fireEvent.change(screen.getByLabelText('After snapshot', { exact: true }), {
      target: { value: 'before' },
    });
    expect(screen.getByText('Select two distinct snapshots.')).toBeInTheDocument();
    selectPair();
    expect(screen.getByRole('combobox', { name: 'Before snapshot' })).toHaveValue('before');
    expect(screen.getByRole('combobox', { name: 'After snapshot' })).toHaveValue('after');
    const counters = screen.getByRole('region', { name: 'Snapshot counter differences' });
    expect(
      within(counters).getByRole('row', { name: 'Inserted records 0 10 +10' })
    ).toBeInTheDocument();
    expect(within(counters).getByRole('row', { name: 'Consumer lag 3 0 -3' })).toBeInTheDocument();
    expect(screen.getByText('Consumer paused').parentElement).toHaveTextContent('true → false');
    expect(screen.getAllByText(/Freshness unavailable/).length).toBeGreaterThan(0);
    expect(screen.getByText(/DAG: Published in memory/)).toHaveTextContent('Stale at capture');
    expect(screen.getByRole('region', { name: 'Snapshot model contracts' })).toHaveTextContent(
      'Not present'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete snapshot Before' }));
    expect(remove).toHaveBeenCalledWith('before');
    expect(screen.getByLabelText('Snapshot name')).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Clear snapshots' }));
    expect(clear).toHaveBeenCalledTimes(1);
  });
  it('disables capture at the limit or while busy and discloses bounded evidence', () => {
    const snapshots = Array.from({ length: 6 }, (_, index) => ({
      ...before,
      id: `capture-${index}`,
      clipped: { ...before.clipped, tables: true },
    }));
    vi.mocked(useRunSnapshots).mockReturnValue({ snapshots, capture, remove, clear });
    const view = render(<RunComparison />);
    fireEvent.change(screen.getByLabelText('Snapshot name'), { target: { value: 'Another' } });
    expect(screen.getByRole('button', { name: 'Capture snapshot' })).toBeDisabled();
    expect(screen.getByText(/Some snapshot evidence was bounded/)).toBeInTheDocument();
    vi.mocked(useRunSnapshots).mockReturnValue({ snapshots: [before], capture, remove, clear });
    vi.mocked(useRuntime).mockReturnValue({ loading: true } as ReturnType<typeof useRuntime>);
    view.rerender(<RunComparison />);
    expect(screen.getByRole('button', { name: 'Capture snapshot' })).toBeDisabled();
  });
  it('downloads the selected allowlisted immutable pair, excluding runtime private fields', async () => {
    const makeUrl = vi.fn<(value: Blob) => string>(() => 'blob:comparison');
    vi.stubGlobal('URL', { createObjectURL: makeUrl, revokeObjectURL: vi.fn() });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    vi.mocked(useRunSnapshots).mockReturnValue({
      snapshots: [before, after],
      capture,
      remove,
      clear,
    });
    render(<RunComparison />);
    selectPair();
    fireEvent.click(screen.getByRole('button', { name: 'Download comparison evidence' }));
    expect(click).toHaveBeenCalledTimes(1);
    expect(click.mock.instances[0]).toHaveAttribute(
      'download',
      'dataplayground-run-comparison.json'
    );
    const reader = new FileReader();
    reader.readAsText(makeUrl.mock.calls[0][0] as Blob);
    await waitFor(() => expect(reader.readyState).toBe(FileReader.DONE));
    const text = String(reader.result);
    expect(text).not.toContain('private');
    const data = JSON.parse(text);
    expect(data.before.id).toBe('before');
    expect(data.after.id).toBe('after');
    expect(
      data.comparison.metrics.find((metric: { name: string }) => metric.name === 'inserted').delta
    ).toBe(10);
  });
  it('disambiguates duplicate names in options, deletion controls, and displayed captures without renaming unique snapshots', () => {
    const duplicateBefore = { ...before, label: 'Checkpoint' };
    const duplicateAfter = { ...after, label: 'Checkpoint' };
    const unique = { ...before, id: 'unique', label: 'Unique capture' };
    vi.mocked(useRunSnapshots).mockReturnValue({
      snapshots: [duplicateBefore, duplicateAfter, unique],
      capture,
      remove,
      clear,
    });
    render(<RunComparison />);
    const selector = screen.getByLabelText('Before snapshot', { exact: true });
    expect(within(selector).getByRole('option', { name: 'Checkpoint (before)' })).toHaveValue(
      'before'
    );
    expect(within(selector).getByRole('option', { name: 'Checkpoint (after)' })).toHaveValue(
      'after'
    );
    expect(within(selector).getByRole('option', { name: 'Unique capture' })).toHaveValue('unique');
    expect(screen.getByText('Checkpoint (before)', { selector: 'strong' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete snapshot Checkpoint (after)' }));
    expect(remove).toHaveBeenCalledWith('after');
    expect(
      screen.getByRole('button', { name: 'Delete snapshot Unique capture' })
    ).toBeInTheDocument();
    selectPair();
    const executions = screen
      .getByRole('region', { name: 'Observed-state snapshots' })
      .querySelector<HTMLElement>('.lab-comparison-executions');
    expect(executions).toBeInTheDocument();
    expect(
      within(executions!).getByRole('heading', { name: 'Checkpoint (before)' })
    ).toBeInTheDocument();
  });
  it('explains absent model executions instead of rendering an empty model comparison table', () => {
    const unexecuted = { ...before, id: 'after', label: 'After' };
    vi.mocked(useRunSnapshots).mockReturnValue({
      snapshots: [before, unexecuted],
      capture,
      remove,
      clear,
    });
    render(<RunComparison />);
    selectPair();
    expect(
      screen.getByText('No SQL model executions recorded in either snapshot.')
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Snapshot model contracts' })
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Inspect recorded contract tests')).not.toBeInTheDocument();
  });
  it('distinguishes empty tests from passed tests and exposes the recorded before/after contract evidence', () => {
    const noTests = {
      ...before,
      models: { ...after.models, runs: [{ ...after.models.runs[0], tests: [] }] },
    };
    const failedTest = {
      ...after,
      models: {
        ...after.models,
        runs: [
          {
            ...after.models.runs[0],
            status: 'failed' as const,
            tests: [{ name: 'grain', status: 'fail' as const, failed_rows: 7 }],
          },
        ],
      },
    };
    vi.mocked(useRunSnapshots).mockReturnValue({
      snapshots: [noTests, failedTest],
      capture,
      remove,
      clear,
    });
    render(<RunComparison />);
    selectPair();
    const summary = screen.getByRole('region', { name: 'Snapshot model contracts' });
    expect(summary).toHaveTextContent('No recorded contract tests · success');
    expect(summary).not.toHaveTextContent('0 / 0 pass');
    fireEvent.click(screen.getByText('Inspect recorded contract tests'));
    expect(screen.getByText('No recorded contract tests.')).toBeVisible();
    const evidence = screen.getByRole('region', { name: 'After runtime_daily contract evidence' });
    expect(within(evidence).getByRole('row', { name: 'grain fail 7' })).toBeVisible();
    expect(capture).not.toHaveBeenCalled();
  });
});
