import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReactNode } from 'react';

import { ApiError, endpoints, getJson, postJson } from '../../shared/utils/api';
import { RuntimeProvider, useRuntime } from './use-runtime';

import type { RuntimeSession, RuntimeState } from './runtime-types';
import type { Catalog } from './types';

vi.mock('../../shared/utils/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../shared/utils/api')>()),
  getJson: vi.fn(),
  postJson: vi.fn(),
}));
const catalog: Catalog = {
  schema_version: 1,
  engine_version: '1',
  source: { repository: '', command: '' },
  live_simulation: false,
  runs: [],
};
const state: RuntimeState = {
  scenario_id: 'baseline',
  runtime: 'Local runtime',
  source: 'Saved sample',
  expires_in_seconds: 1200,
  tables: [],
  streaming: {
    producer_running: false,
    consumer_paused: true,
    batch_size: 10,
    rate_per_second: 5,
    consumer_batch_size: 100,
    consumer_rate_per_second: 5,
    partitions: [],
    produced: 0,
    consumed: 0,
    inserted: 0,
    duplicates: 0,
    quarantined: 0,
    accepted: 0,
    duplicate_rate: 0,
    invalid_rate: 0,
    backlog: 0,
    capacity: 2000,
  },
  dag_trace: [],
  dag_published: false,
  dag_fingerprint: null,
  model_runs: [],
  logs: [],
  flow: [],
};
const session: RuntimeSession = { token: 'test-capability-token', expires_in_seconds: 1200, state };
const wrapper = ({ children }: { children: ReactNode }) => (
  <RuntimeProvider catalog={catalog}>{children}</RuntimeProvider>
);
beforeEach(() => {
  vi.mocked(getJson).mockReset();
  vi.mocked(postJson).mockReset();
  vi.mocked(postJson).mockImplementation(async (path) =>
    path === endpoints.dataPlaygroundSession ? session : undefined
  );
  vi.mocked(getJson).mockResolvedValue(state);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('visitor runtime state', () => {
  it('allocates only on explicit request and sends capabilities in headers without persisting them', async () => {
    const { result } = renderHook(useRuntime, { wrapper });
    expect(postJson).not.toHaveBeenCalled();
    expect(getJson).not.toHaveBeenCalled();
    await act(async () => result.current.create('baseline'));
    expect(result.current.state?.scenario_id).toBe('baseline');
    await act(async () => result.current.action({ action: 'producer_stop' }));
    expect(postJson).toHaveBeenCalledWith(
      endpoints.dataPlaygroundAction,
      { action: 'producer_stop' },
      expect.objectContaining({ headers: { Authorization: `Bearer ${session.token}` } })
    );
    expect(
      vi.mocked(postJson).mock.calls.every(([path]) => !String(path).includes(session.token))
    ).toBe(true);
    expect(window.location.href).not.toContain(session.token);
  });
  it('discards an old create response and closes its orphaned workspace', async () => {
    let finish!: (value: RuntimeSession) => void;
    vi.mocked(postJson).mockImplementation(async (path, body) => {
      if (path !== endpoints.dataPlaygroundSession) return undefined;
      if ((body as { scenario_id: string }).scenario_id === 'baseline')
        return new Promise<RuntimeSession>((resolve) => {
          finish = resolve;
        });
      return { ...session, token: 'new-token', state: { ...state, scenario_id: 'acquisition' } };
    });
    const { result } = renderHook(useRuntime, { wrapper });
    let first!: Promise<void>;
    act(() => {
      first = result.current.create('baseline');
    });
    await act(async () => result.current.create('acquisition'));
    await act(async () => {
      finish(session);
      await first;
    });
    expect(result.current.session?.token).toBe('new-token');
    expect(result.current.state?.scenario_id).toBe('acquisition');
    expect(postJson).toHaveBeenCalledWith(
      endpoints.dataPlaygroundClose,
      undefined,
      expect.objectContaining({ headers: { Authorization: `Bearer ${session.token}` } })
    );
  });
  it('preserves the existing workspace and latest results when replacement allocation fails', async () => {
    const { result } = renderHook(useRuntime, { wrapper });
    await act(async () => result.current.create('baseline'));
    const latest = { ...state, streaming: { ...state.streaming, produced: 10 } };
    vi.mocked(postJson).mockResolvedValueOnce(latest);
    await act(async () => result.current.action({ action: 'produce', batch_size: 10 }));
    vi.mocked(postJson).mockRejectedValueOnce(new ApiError(429, 'Workspace capacity reached'));
    await act(async () => result.current.create('acquisition'));
    expect(result.current.session?.token).toBe(session.token);
    expect(result.current.state).toEqual(latest);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Workspace capacity reached');
    expect(
      vi.mocked(postJson).mock.calls.filter(([path]) => path === endpoints.dataPlaygroundClose)
    ).toHaveLength(0);
    await act(async () => result.current.refresh());
    expect(getJson).toHaveBeenCalledWith(
      endpoints.dataPlaygroundState,
      expect.objectContaining({ headers: { Authorization: `Bearer ${session.token}` } })
    );
  });
  it('closes the previous workspace only after a successful replacement is allocated', async () => {
    const { result } = renderHook(useRuntime, { wrapper });
    await act(async () => result.current.create('baseline'));
    let finish!: (value: RuntimeSession) => void;
    vi.mocked(postJson).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    let replacement!: Promise<void>;
    act(() => {
      replacement = result.current.create('acquisition');
    });
    expect(result.current.session?.token).toBe(session.token);
    expect(result.current.state).toEqual(state);
    expect(
      vi.mocked(postJson).mock.calls.filter(([path]) => path === endpoints.dataPlaygroundClose)
    ).toHaveLength(0);
    const next = {
      ...session,
      token: 'allocated-replacement',
      state: { ...state, scenario_id: 'acquisition' },
    };
    await act(async () => {
      finish(next);
      await replacement;
    });
    expect(result.current.session?.token).toBe(next.token);
    expect(result.current.state).toEqual(next.state);
    expect(postJson).toHaveBeenCalledWith(
      endpoints.dataPlaygroundClose,
      undefined,
      expect.objectContaining({ headers: { Authorization: `Bearer ${session.token}` } })
    );
  });
  it('keeps the existing workspace after a newer replacement fails and closes a stale allocation', async () => {
    const { result } = renderHook(useRuntime, { wrapper });
    await act(async () => result.current.create('baseline'));
    let finish!: (value: RuntimeSession) => void;
    vi.mocked(postJson).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    let first!: Promise<void>;
    act(() => {
      first = result.current.create('acquisition');
    });
    vi.mocked(postJson).mockRejectedValueOnce(new Error('Replacement unavailable'));
    await act(async () => result.current.create('retention'));
    await act(async () => {
      finish({ ...session, token: 'orphan-allocation' });
      await first;
    });
    expect(result.current.session?.token).toBe(session.token);
    expect(result.current.state).toEqual(state);
    expect(result.current.error).toBe('Replacement unavailable');
    expect(result.current.loading).toBe(false);
    const closed = vi
      .mocked(postJson)
      .mock.calls.filter(([path]) => path === endpoints.dataPlaygroundClose);
    expect(closed).toHaveLength(1);
    expect(closed[0][2]).toEqual(
      expect.objectContaining({ headers: { Authorization: 'Bearer orphan-allocation' } })
    );
  });
  it('does not let a stale polling snapshot overwrite a newer action result', async () => {
    const { result } = renderHook(useRuntime, { wrapper });
    await act(async () => result.current.create('baseline'));
    let finish!: (value: RuntimeState) => void;
    vi.mocked(getJson).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    let poll!: Promise<void>;
    act(() => {
      poll = result.current.refresh();
    });
    vi.mocked(postJson).mockResolvedValueOnce({
      ...state,
      streaming: { ...state.streaming, produced: 10 },
    });
    await act(async () => result.current.action({ action: 'produce', batch_size: 10 }));
    await act(async () => {
      finish(state);
      await poll;
    });
    expect(result.current.state?.streaming.produced).toBe(10);
  });
  it('cleans up both the retained workspace and a replacement allocated after unmount', async () => {
    const { result, unmount } = renderHook(useRuntime, { wrapper });
    await act(async () => result.current.create('baseline'));
    let finish!: (value: RuntimeSession) => void;
    vi.mocked(postJson).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    let replacement!: Promise<void>;
    act(() => {
      replacement = result.current.create('acquisition');
    });
    unmount();
    await act(async () => {
      finish({ ...session, token: 'late-allocation' });
      await replacement;
    });
    const closed = vi
      .mocked(postJson)
      .mock.calls.filter(([path]) => path === endpoints.dataPlaygroundClose);
    expect(
      closed.map(([, , init]) => (init?.headers as Record<string, string>).Authorization)
    ).toEqual([`Bearer ${session.token}`, 'Bearer late-allocation']);
  });
  it('serializes copilot confirmation with manual mutations and ignores older polling state', async () => {
    const { result } = renderHook(useRuntime, { wrapper });
    await act(async () => result.current.create('baseline'));
    let finishPoll!: (value: RuntimeState) => void;
    vi.mocked(getJson).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishPoll = resolve;
        })
    );
    let poll!: Promise<void>;
    act(() => {
      poll = result.current.refresh();
    });
    let finishConfirm!: (value: RuntimeState) => void;
    vi.mocked(postJson).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishConfirm = resolve;
        })
    );
    let confirmation!: Promise<boolean>;
    act(() => {
      confirmation = result.current.confirm('proposal-id');
    });
    const calls = vi.mocked(postJson).mock.calls.length;
    await act(async () => result.current.action({ action: 'consumer_resume' }));
    expect(postJson).toHaveBeenCalledTimes(calls);
    await act(async () => {
      finishConfirm({
        ...state,
        streaming: { ...state.streaming, consumer_paused: true, produced: 20 },
      });
      expect(await confirmation).toBe(true);
    });
    await act(async () => {
      finishPoll(state);
      await poll;
    });
    expect(result.current.state?.streaming.produced).toBe(20);
    expect(result.current.loading).toBe(false);
  });
  it('clears expired workspaces and stops authenticated polling', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(useRuntime, { wrapper });
    await act(async () => result.current.create('baseline'));
    vi.mocked(getJson).mockRejectedValueOnce(new ApiError(410, 'Expired'));
    await act(async () => result.current.refresh());
    expect(result.current.session).toBeNull();
    expect(result.current.state).toBeNull();
    expect(result.current.error).toContain('expired');
    const count = vi.mocked(getJson).mock.calls.length;
    await act(async () => vi.advanceTimersByTimeAsync(6000));
    expect(getJson).toHaveBeenCalledTimes(count);
  });
  it('discards query results from a workspace that was replaced while the query ran', async () => {
    const { result } = renderHook(useRuntime, { wrapper });
    await act(async () => result.current.create('baseline'));
    let finish!: (value: {
      columns: string[];
      rows: number[][];
      row_count: number;
      truncated: boolean;
      elapsed_ms: number;
    }) => void;
    vi.mocked(postJson).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    let pending!: ReturnType<typeof result.current.query>;
    act(() => {
      pending = result.current.query({ sql: 'SELECT 1;', row_limit: 10 });
    });
    vi.mocked(postJson).mockImplementation(async (path) =>
      path === endpoints.dataPlaygroundSession
        ? { ...session, token: 'replacement', state: { ...state, scenario_id: 'acquisition' } }
        : undefined
    );
    await act(async () => result.current.create('acquisition'));
    let reply;
    await act(async () => {
      finish({ columns: ['old'], rows: [[1]], row_count: 1, truncated: false, elapsed_ms: 1 });
      reply = await pending;
    });
    expect(reply).toBeUndefined();
    expect(result.current.state?.scenario_id).toBe('acquisition');
  });
  it('polls allocated workspaces only while the document is visible', async () => {
    vi.useFakeTimers();
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    const { result } = renderHook(useRuntime, { wrapper });
    await act(async () => result.current.create('baseline'));
    await act(async () => vi.advanceTimersByTimeAsync(4000));
    expect(getJson).not.toHaveBeenCalled();
    visibility.mockReturnValue('visible');
    await act(async () => vi.advanceTimersByTimeAsync(2000));
    expect(getJson).toHaveBeenCalledTimes(1);
    visibility.mockRestore();
  });
});
