import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import type { ReactNode } from 'react';

import { ApiError, endpoints, getJson, postJson } from '../../shared/utils/api';

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
  action: (request: RuntimeAction) => Promise<void>;
  query: (request: QueryRequest) => Promise<QueryResult | undefined>;
  refresh: () => Promise<void>;
  confirm: (proposalId: string) => Promise<boolean>;
}
const RuntimeContext = createContext<RuntimeContextValue | null>(null);
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

  const fail = useCallback((cause: unknown, expectedGeneration: number) => {
    if (!mounted.current || generation.current !== expectedGeneration) return;
    if (cause instanceof ApiError && cause.status === 410) {
      generation.current += 1;
      current.current = null;
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
      if (mounted.current && expected === generation.current && version === revision.current)
        setState(next);
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
      if (!allocated || busy.current) return false;
      const expected = generation.current;
      const version = ++revision.current;
      busy.current = true;
      setLoading(true);
      setError('');
      try {
        const next = await postJson<RuntimeState>(path, request, authorization(allocated.token));
        if (mounted.current && expected === generation.current && version === revision.current) {
          setState(next);
          return true;
        }
        return false;
      } catch (cause) {
        fail(cause, expected);
        return false;
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
      await mutate(endpoints.dataPlaygroundAction, request);
    },
    [mutate]
  );
  const confirm = useCallback(
    (proposalId: string) => mutate(endpoints.dataPlaygroundCopilotConfirm, { id: proposalId }),
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
      value={{ session, state, loading, error, create, action, query, refresh, confirm }}
    >
      {children}
    </RuntimeContext.Provider>
  );
}

export function useRuntime() {
  const value = useContext(RuntimeContext);
  if (!value) throw new Error('Runtime tools must be inside RuntimeProvider.');
  return value;
}
