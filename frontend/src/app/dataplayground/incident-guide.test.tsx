import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IncidentGuide } from './incident-guide';
import { useRuntime } from './use-runtime';

import type { RuntimeState } from './runtime-types';

vi.mock('./use-runtime', () => ({ useRuntime: vi.fn() }));
const initial: RuntimeState = {
  scenario_id: 'baseline',
  runtime: 'SQLite',
  source: 'Saved sample',
  expires_in_seconds: 1200,
  workspace_generation: 1,
  data_revision: 0,
  dag_input_revision: null,
  model_input_revision: null,
  dag_stale: false,
  models_stale: false,
  tables: [],
  model_runs: [],
  dag_trace: [],
  dag_published: false,
  dag_fingerprint: null,
  logs: [],
  flow: [],
  streaming: {
    producer_running: true,
    consumer_paused: false,
    batch_size: 10,
    rate_per_second: 5,
    consumer_batch_size: 100,
    consumer_rate_per_second: 5,
    partitions: [{ partition: 0, produced_offset: 0, consumed_offset: 0, backlog: 0 }],
    produced: 0,
    consumed: 0,
    inserted: 0,
    duplicates: 0,
    quarantined: 0,
    accepted: 0,
    duplicate_rate: 0.1,
    invalid_rate: 0.1,
    backlog: 0,
    capacity: 2000,
  },
};
let state: RuntimeState;
const action = vi.fn();
let currentToken = 'visitor';
function context(token = currentToken) {
  currentToken = token;
  vi.mocked(useRuntime).mockReturnValue({
    session: { token, expires_in_seconds: 1200, state },
    state,
    loading: false,
    error: '',
    action,
    create: vi.fn(),
    refresh: vi.fn(),
    query: vi.fn(),
    confirm: vi.fn(),
  });
}
function receipt(next: RuntimeState) {
  state = next;
  context();
  return next;
}
function open() {
  fireEvent.click(screen.getByText('Guided incident investigations'));
}
async function click(name: string, checkpoint: number) {
  fireEvent.click(screen.getByRole('button', { name }));
  await waitFor(() => expect(screen.getAllByText(/Observed checkpoint:/)).toHaveLength(checkpoint));
}
const published = (): RuntimeState => ({
  ...state,
  dag_published: true,
  dag_fingerprint: 'a'.repeat(64),
  dag_trace: [{ task_id: 'publish', attempt: 1, status: 'success', detail: 'Published.' }],
  model_runs: [
    {
      name: 'runtime_daily',
      status: 'success',
      row_count: 2,
      sql: 'SELECT 1',
      source: 'Runtime',
      tests: [{ name: 'grain', status: 'pass', failed_rows: 0, sql: 'SELECT 0' }],
    },
  ],
});
beforeEach(() => {
  state = structuredClone(initial);
  action.mockReset();
  currentToken = 'visitor';
  context();
});
afterEach(cleanup);

describe('manual incident investigations', () => {
  it('hands keyboard focus to each next action and the final observed status', async () => {
    const user = userEvent.setup();
    action.mockImplementation(async (request) => {
      if (request.action === 'producer_stop')
        return receipt({ ...state, streaming: { ...state.streaming, producer_running: false } });
      if (request.action === 'consumer_pause')
        return receipt({ ...state, streaming: { ...state.streaming, consumer_paused: true } });
      if (request.action === 'produce')
        return receipt({ ...state, streaming: { ...state.streaming, produced: 10, backlog: 10 } });
      return receipt({ ...state, streaming: { ...state.streaming, consumed: 10, backlog: 0 } });
    });
    render(<IncidentGuide />);
    open();
    screen.getByRole('button', { name: 'Guide: stop producer' }).focus();
    const nextActions = [
      'Guide: pause consumer',
      'Guide: produce lag batch',
      'Guide: drain recovery batch',
    ];
    for (const name of nextActions) {
      await user.keyboard('{Enter}');
      await waitFor(() => expect(screen.getByRole('button', { name })).toHaveFocus());
    }
    await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.getByRole('status')).toHaveFocus());
    expect(screen.getByRole('status')).toHaveTextContent('Investigation complete');
    expect(action).toHaveBeenCalledTimes(4);
  });
  it('preserves focus moved elsewhere while an action is awaiting its receipt', async () => {
    const user = userEvent.setup();
    let resolve!: (value: RuntimeState) => void;
    action.mockReturnValue(
      new Promise<RuntimeState>((done) => {
        resolve = done;
      })
    );
    render(
      <>
        <button>Another control</button>
        <IncidentGuide />
      </>
    );
    open();
    screen.getByRole('button', { name: 'Guide: stop producer' }).focus();
    await user.keyboard('{Enter}');
    const elsewhere = screen.getByRole('button', { name: 'Another control' });
    elsewhere.focus();
    await act(async () => {
      resolve(receipt({ ...state, streaming: { ...state.streaming, producer_running: false } }));
    });
    expect(elsewhere).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Guide: pause consumer' })).toBeInTheDocument();
  });
  it('handles body focus after disabling the action but respects an intentional outside click', async () => {
    const user = userEvent.setup();
    let resolve!: (value: RuntimeState) => void;
    action.mockImplementation(
      () =>
        new Promise<RuntimeState>((done) => {
          resolve = done;
        })
    );
    render(<IncidentGuide />);
    open();
    const origin = screen.getByRole('button', { name: 'Guide: stop producer' });
    origin.focus();
    await user.keyboard('{Enter}');
    // Some browsers blur a button when it becomes disabled during the request.
    origin.blur();
    expect(document.body).toHaveFocus();
    await act(async () => {
      resolve(receipt({ ...state, streaming: { ...state.streaming, producer_running: false } }));
    });
    const next = screen.getByRole('button', { name: 'Guide: pause consumer' });
    expect(next).toHaveFocus();
    await user.keyboard('{Enter}');
    next.blur();
    fireEvent.pointerDown(document.body);
    await act(async () => {
      resolve(receipt({ ...state, streaming: { ...state.streaming, consumer_paused: true } }));
    });
    expect(document.body).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Guide: produce lag batch' })).not.toHaveFocus();
  });
  it('makes one action per click and verifies lag and recovery from returned evidence', async () => {
    action.mockImplementation(async (request) => {
      if (request.action === 'producer_stop')
        return receipt({ ...state, streaming: { ...state.streaming, producer_running: false } });
      if (request.action === 'consumer_pause')
        return receipt({ ...state, streaming: { ...state.streaming, consumer_paused: true } });
      if (request.action === 'produce')
        return receipt({ ...state, streaming: { ...state.streaming, produced: 10, backlog: 10 } });
      return receipt({
        ...state,
        streaming: {
          ...state.streaming,
          consumed: 10,
          backlog: 0,
          inserted: 8,
          duplicates: 1,
          quarantined: 1,
        },
      });
    });
    render(<IncidentGuide />);
    open();
    expect(action).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: 'Guide: produce lag batch' })
    ).not.toBeInTheDocument();
    await click('Guide: stop producer', 1);
    await click('Guide: pause consumer', 2);
    await click('Guide: produce lag batch', 3);
    expect(action).toHaveBeenNthCalledWith(3, {
      action: 'produce',
      batch_size: 10,
      rate_per_second: 5,
      partitions: 1,
      duplicate_rate: 0,
      invalid_rate: 0,
    });
    expect(screen.getByText(/Produced 0 → 10; backlog 0 → 10/)).toBeInTheDocument();
    await click('Guide: drain recovery batch', 4);
    expect(action).toHaveBeenLastCalledWith({ action: 'consumer_drain', limit: 500 });
    expect(action).toHaveBeenCalledTimes(4);
    expect(screen.getByRole('status')).toHaveTextContent('Investigation complete');
    expect(screen.getByText(/8 inserted, 1 deduplicated, 1 quarantined/)).toBeInTheDocument();
  });
  it('does not advance on failed or contradictory responses and allows a partial drain to be repeated', async () => {
    render(<IncidentGuide />);
    open();
    action.mockResolvedValueOnce(undefined).mockResolvedValueOnce(initial);
    fireEvent.click(screen.getByRole('button', { name: 'Guide: stop producer' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('No successful action result')
    );
    fireEvent.click(screen.getByRole('button', { name: 'Guide: stop producer' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Checkpoint not met'));
    expect(screen.queryByText(/Observed checkpoint:/)).not.toBeInTheDocument();
    action.mockImplementation(async (request) => {
      if (request.action === 'producer_stop')
        return receipt({ ...state, streaming: { ...state.streaming, producer_running: false } });
      if (request.action === 'consumer_pause')
        return receipt({ ...state, streaming: { ...state.streaming, consumer_paused: true } });
      if (request.action === 'produce')
        return receipt({
          ...state,
          streaming: { ...state.streaming, produced: 600, backlog: 600 },
        });
      return receipt({
        ...state,
        streaming: {
          ...state.streaming,
          consumed: state.streaming.consumed + 500,
          backlog: Math.max(0, state.streaming.backlog - 500),
        },
      });
    });
    await click('Guide: stop producer', 1);
    await click('Guide: pause consumer', 2);
    await click('Guide: produce lag batch', 3);
    fireEvent.click(screen.getByRole('button', { name: 'Guide: drain recovery batch' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Backlog 600 → 100'));
    expect(screen.getAllByText(/Observed checkpoint:/)).toHaveLength(3);
    await click('Guide: drain recovery batch', 4);
  });
  it('verifies recovery already completed through regular controls without inventing another drain', async () => {
    action.mockImplementation(async (request) => {
      if (request.action === 'producer_stop')
        return receipt({ ...state, streaming: { ...state.streaming, producer_running: false } });
      if (request.action === 'consumer_pause')
        return receipt({ ...state, streaming: { ...state.streaming, consumer_paused: true } });
      if (request.action === 'produce')
        return receipt({ ...state, streaming: { ...state.streaming, produced: 10, backlog: 10 } });
      return receipt(state);
    });
    const view = render(<IncidentGuide />);
    open();
    await click('Guide: stop producer', 1);
    await click('Guide: pause consumer', 2);
    await click('Guide: produce lag batch', 3);
    // A regular consumer control clears the log before the final guided action.
    state = {
      ...state,
      streaming: {
        ...state.streaming,
        consumed: 10,
        backlog: 0,
        inserted: 10,
        consumer_paused: false,
      },
    };
    context();
    view.rerender(<IncidentGuide />);
    fireEvent.click(screen.getByRole('button', { name: 'Guide: drain recovery batch' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Checkpoint not met'));
    expect(screen.getAllByText(/Observed checkpoint:/)).toHaveLength(3);
    state = { ...state, streaming: { ...state.streaming, consumer_paused: true } };
    context();
    view.rerender(<IncidentGuide />);
    await click('Guide: drain recovery batch', 4);
    expect(screen.getByText(/Verified already recovered/)).toHaveTextContent(
      'consumer attempts 10 → 10'
    );
    expect(screen.getByRole('status')).toHaveTextContent('Investigation complete');
    expect(action).toHaveBeenLastCalledWith({ action: 'consumer_drain', limit: 500 });
  });
  it('requires observed blocked publication and fresh successful contracts for repair', async () => {
    state = published();
    context();
    render(<IncidentGuide />);
    open();
    fireEvent.change(screen.getByLabelText('Investigation'), { target: { value: 'publication' } });
    expect(screen.getByRole('status')).toHaveTextContent('0 / 2');
    action.mockImplementationOnce(async () =>
      receipt({
        ...state,
        dag_published: false,
        dag_fingerprint: null,
        dag_trace: [
          { task_id: 'validate', attempt: 1, status: 'failed', detail: 'Injected.' },
          { task_id: 'publish', attempt: 0, status: 'blocked', detail: 'Dependency.' },
        ],
      })
    );
    await click('Guide: run failing DAG', 1);
    expect(action).toHaveBeenLastCalledWith({ action: 'dag_run', failure: 'permanent' });
    action.mockImplementationOnce(async () => receipt({ ...published(), dag_stale: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Guide: run repaired DAG' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Checkpoint not met'));
    action.mockImplementationOnce(async () => receipt({ ...published(), dag_stale: false }));
    await click('Guide: run repaired DAG', 2);
    expect(action).toHaveBeenLastCalledWith({ action: 'dag_run', failure: 'none' });
    expect(screen.getByRole('status')).toHaveTextContent('Investigation complete');
  });
  it('resets checkpoints on replacement or reset, and Restart guide does not mutate the workspace', async () => {
    action.mockImplementation(async () =>
      receipt({ ...state, streaming: { ...state.streaming, producer_running: false } })
    );
    const view = render(<IncidentGuide />);
    open();
    await click('Guide: stop producer', 1);
    fireEvent.click(screen.getByRole('button', { name: 'Restart guide' }));
    expect(screen.getByRole('status')).toHaveTextContent('0 / 4');
    expect(action).toHaveBeenCalledTimes(1);
    await click('Guide: stop producer', 1);
    context('replacement');
    view.rerender(<IncidentGuide />);
    open();
    expect(screen.getByRole('status')).toHaveTextContent('0 / 4');
    await click('Guide: stop producer', 1);
    state = { ...state, workspace_generation: 2 };
    context();
    view.rerender(<IncidentGuide />);
    open();
    expect(screen.getByRole('status')).toHaveTextContent('0 / 4');
  });
});
