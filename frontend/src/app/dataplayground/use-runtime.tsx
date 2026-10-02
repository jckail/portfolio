import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import type { ReactNode } from 'react';

import { ApiError, endpoints, getJson, postJson } from '../../shared/utils/api';
import { createRunSnapshot, MAX_SNAPSHOTS } from './run-snapshots';

import type { RunSnapshot } from './run-snapshots';
import type {
  QueryRequest,
  QueryResult,
  RuntimeAction,
  RuntimeSession,
  RuntimeState,
} from './runtime-types';
import type { Catalog } from './types';

interface RuntimeContextValue {
  session: RuntimeSession | null;
  state: RuntimeState | null;
  loading: boolean;
  error: string;
  create: (scenarioId: string) => Promise<void>;
  action: (request: RuntimeAction) => Promise<RuntimeState | undefined>;
  query: (request: QueryRequest) => Promise<QueryResult | undefined>;
  refresh: () => Promise<void>;
  confirm: (proposalId: string) => Promise<boolean>;
}
interface SnapshotContextValue {
  snapshots: readonly RunSnapshot[];
  capture: (label: string) => boolean;
  remove: (id: string) => void;
  clear: () => void;
}
const RuntimeContext = createContext<(RuntimeContextValue & SnapshotContextValue) | null>(null);
const authorization = (token: string) => ({
  headers: { Authorization: `Bearer ${token}` },
  cache: 'no-store' as const,
});
const close = (token: string) =>
  postJson(endpoints.dataPlaygroundClose, undefined, {
    ...authorization(token),
    keepalive: true,
  }).catch(() => undefined);

export function RuntimeProvider({ children }: { catalog: Catalog; children: ReactNode }) {
  const [session, setSession] = useState<RuntimeSession | null>(null);
  const [state, setState] = useState<RuntimeState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const current = useRef<RuntimeSession | null>(null);
  const generation = useRef(0);
  const revision = useRef(0);
  const busy = useRef(false);
  const mounted = useRef(true);
  const polling = useRef(false);
  const acceptedState = useRef<RuntimeState | null>(null);
  const storedSnapshots = useRef<{
    token: string;
    workspaceGeneration: number | undefined;
    values: readonly RunSnapshot[];
  } | null>(null);
  const snapshotSequence = useRef(0);
  const [, renderSnapshots] = useState(0);
  const displayedState = useRef(state);
  displayedState.current = state;
  const displayedGeneration = generation.current;
  const clear = useCallback(() => {
    if (
      !mounted.current ||
      current.current?.token !== session?.token ||
      generation.current !== displayedGeneration ||
      acceptedState.current?.workspace_generation !== state?.workspace_generation
    )
      return;
    storedSnapshots.current = null;
    renderSnapshots((value) => value + 1);
  }, [session?.token, state?.workspace_generation, displayedGeneration]);
  const capture = useCallback(
    (label: string) => {
      const name = label.trim();
      if (
        !mounted.current ||
        busy.current ||
        !session ||
        !state ||
        !name ||
        name.length > 60 ||
        current.current?.token !== session.token ||
        generation.current !== displayedGeneration ||
        displayedState.current !== state ||
        acceptedState.current !== state
      )
        return false;
      const previous = storedSnapshots.current;
      const values =
        previous?.token === session.token &&
        previous.workspaceGeneration === state.workspace_generation
          ? previous.values
          : [];
      if (values.length >= MAX_SNAPSHOTS) return false;
      const snapshot = createRunSnapshot(state, name, {
        id: `snapshot-${++snapshotSequence.current}`,
        capturedAt: new Date().toISOString(),
      });
      storedSnapshots.current = {
        token: session.token,
        workspaceGeneration: state.workspace_generation,
        values: [...values, snapshot],
      };
      renderSnapshots((value) => value + 1);
      return true;
    },
    [session, state, displayedGeneration]
  );
  const remove = useCallback(
    (id: string) => {
      if (
        !mounted.current ||
        current.current?.token !== session?.token ||
        generation.current !== displayedGeneration ||
        acceptedState.current?.workspace_generation !== state?.workspace_generation
      )
        return;
      const stored = storedSnapshots.current;
      if (!stored) return;
      storedSnapshots.current = {
        ...stored,
        values: stored.values.filter((snapshot) => snapshot.id !== id),
      };
      renderSnapshots((value) => value + 1);
    },
    [session?.token, state?.workspace_generation, displayedGeneration]
  );
  const snapshots =
    session &&
    state &&
    storedSnapshots.current?.token === session.token &&
    storedSnapshots.current.workspaceGeneration === state.workspace_generation
      ? storedSnapshots.current.values
      : [];

  const fail = useCallback((cause: unknown, expectedGeneration: number) => {
    if (!mounted.current || generation.current !== expectedGeneration) return;
    if (cause instanceof ApiError && cause.status === 410) {
      generation.current += 1;
      current.current = null;
      acceptedState.current = null;
      storedSnapshots.current = null;
      setSession(null);
      setState(null);
      setError('Your workspace expired. Create a workspace to continue.');
      busy.current = false;
      setLoading(false);
    } else {
      setError(
        cause instanceof Error
          ? cause.message
          : 'The workspace request could not finish. Try again.'
      );
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current += 1;
      if (current.current) void close(current.current.token);
      current.current = null;
      acceptedState.current = null;
      storedSnapshots.current = null;
    };
  }, []);

  const create = useCallback(async (scenarioId: string) => {
    const expected = ++generation.current;
    revision.current += 1;
    const previous = current.current;
    setLoading(true);
    busy.current = true;
    setError('');
    try {
      const next = await postJson<RuntimeSession>(
        endpoints.dataPlaygroundSession,
        { scenario_id: scenarioId },
        { cache: 'no-store' }
      );
      if (!mounted.current || expected !== generation.current) {
        void close(next.token);
        return;
      }
      current.current = next;
      acceptedState.current = next.state;
      storedSnapshots.current = null;
      setSession(next);
      setState(next.state);
      if (previous && previous.token !== next.token) void close(previous.token);
    } catch (cause) {
      // An allocation error concerns the proposed replacement, not the
      // capability or latest state of the workspace that remains open.
      if (mounted.current && expected === generation.current) {
        setError(
          cause instanceof Error ? cause.message : 'The workspace could not be created. Try again.'
        );
      }
    } finally {
      if (mounted.current && expected === generation.current) {
        busy.current = false;
        setLoading(false);
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    const allocated = current.current;
    if (!allocated || busy.current || polling.current) return;
    polling.current = true;
    const expected = generation.current;
    const version = revision.current;
    try {
      const next = await getJson<RuntimeState>(
        endpoints.dataPlaygroundState,
        authorization(allocated.token)
      );
      if (mounted.current && expected === generation.current && version === revision.current) {
        acceptedState.current = next;
        if (storedSnapshots.current?.workspaceGeneration !== next.workspace_generation)
          storedSnapshots.current = null;
        setState(next);
      }
    } catch (cause) {
      if (version === revision.current) fail(cause, expected);
    } finally {
      polling.current = false;
    }
  }, [fail]);

  useEffect(() => {
    if (!session) return;
    const tick = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const timer = window.setInterval(tick, 2000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [session, refresh]);

  const mutate = useCallback(
    async (path: string, request: RuntimeAction | { id: string }) => {
      const allocated = current.current;
      if (!allocated || busy.current) return undefined;
      const expected = generation.current;
      const version = ++revision.current;
      busy.current = true;
      setLoading(true);
      setError('');
      try {
        const next = await postJson<RuntimeState>(path, request, authorization(allocated.token));
        if (mounted.current && expected === generation.current && version === revision.current) {
          acceptedState.current = next;
          if (
            ('action' in request && request.action === 'reset') ||
            storedSnapshots.current?.workspaceGeneration !== next.workspace_generation
          )
            storedSnapshots.current = null;
          setState(next);
          return next;
        }
        return undefined;
      } catch (cause) {
        fail(cause, expected);
        return undefined;
      } finally {
        if (mounted.current && expected === generation.current) {
          busy.current = false;
          setLoading(false);
        }
      }
    },
    [fail]
  );
  const action = useCallback(
    async (request: RuntimeAction) => {
      return await mutate(endpoints.dataPlaygroundAction, request);
    },
    [mutate]
  );
  const confirm = useCallback(
    async (proposalId: string) =>
      Boolean(await mutate(endpoints.dataPlaygroundCopilotConfirm, { id: proposalId })),
    [mutate]
  );

  const query = useCallback(
    async (request: QueryRequest) => {
      const allocated = current.current;
      if (!allocated || busy.current) return undefined;
      const expected = generation.current;
      busy.current = true;
      setLoading(true);
      setError('');
      try {
        const result = await postJson<QueryResult>(
          endpoints.dataPlaygroundQuery,
          request,
          authorization(allocated.token)
        );
        return mounted.current && expected === generation.current ? result : undefined;
      } catch (cause) {
        fail(cause, expected);
        return undefined;
      } finally {
        if (mounted.current && expected === generation.current) {
          busy.current = false;
          setLoading(false);
          void refresh();
        }
      }
    },
    [fail, refresh]
  );

  return (
    <RuntimeContext.Provider
      value={{
        session,
        state,
        loading,
        error,
        create,
        action,
        query,
        refresh,
        confirm,
        snapshots,
        capture,
        remove,
        clear,
      }}
    >
      {children}
    </RuntimeContext.Provider>
  );
}

export function useRuntime(): RuntimeContextValue {
  const value = useContext(RuntimeContext);
  if (!value) throw new Error('Runtime tools must be inside RuntimeProvider.');
  return value;
}

export function useRunSnapshots(): SnapshotContextValue | null {
  const value = useContext(RuntimeContext);
  if (!value) return null;
  const { snapshots, capture, remove, clear } = value;
  return { snapshots, capture, remove, clear };
}
