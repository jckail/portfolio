import { useEffect, useRef, useState } from 'react';

import { ApiError, endpoints, getJson, postJson } from '../../shared/utils/api';
import { ChatMarkdown } from '../components/chat/components/ChatMarkdown';
import { useRuntime } from './use-runtime';
import './data-copilot.css';

import type { Catalog } from './types';
import type { RuntimeAction } from './runtime-types';

interface Proposal {
  id: string;
  action: RuntimeAction;
  reason: string;
  expires_in_seconds: number;
}
interface ToolEvent {
  type: string;
  tool: string;
  ok?: boolean;
  result?: unknown;
}
interface Reply {
  text: string;
  events: ToolEvent[];
  proposals: Proposal[];
  limited: boolean;
}
interface Message extends Partial<Reply> {
  role: 'user' | 'assistant';
  text: string;
}
function waitForCleanup(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Investigation stopped', 'AbortError'));
      return;
    }
    const cancel = () => {
      clearTimeout(timer);
      reject(new DOMException('Investigation stopped', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', cancel);
      resolve();
    }, 1000);
    signal.addEventListener('abort', cancel, { once: true });
  });
}

const starters = [
  'Inspect my workspace and explain how records move through it.',
  'Query revenue by event date and explain the SQL.',
  'Propose a consumer pause so I can observe lag, then explain how to recover.',
  'Inspect the latest DAG run and explain any retry or blocked task.',
];

export function DataCopilot({ catalog }: { catalog: Catalog }) {
  const { session, state, confirm, loading: runtimeLoading, error: runtimeError } = useRuntime();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [resolved, setResolved] = useState<Record<string, string>>({});
  const tokenRef = useRef(session?.token);
  tokenRef.current = session?.token;
  const abortRef = useRef<AbortController | null>(null);
  const stoppedWorkspaceRef = useRef<string | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    getJson<{ available: boolean }>(endpoints.dataPlaygroundCopilotStatus, { signal: abort.signal })
      .then((status) => setAvailable(status.available))
      .catch(() => {
        if (!abort.signal.aborted) setAvailable(false);
      });
    return () => abort.abort();
  }, []);

  useEffect(() => {
    abortRef.current?.abort();
    stoppedWorkspaceRef.current = null;
    setMessages([]);
    setResolved({});
    setBusy(false);
    setApplying(false);
    setError('');
    return () => abortRef.current?.abort();
  }, [session?.token]);

  async function ask(message = input) {
    const token = session?.token;
    if (!token || !message.trim() || busy || !available) return;
    const abort = new AbortController();
    abortRef.current = abort;
    const retryCleanup = stoppedWorkspaceRef.current === token;
    stoppedWorkspaceRef.current = null;
    const history = messages
      .filter(({ text }) => text.trim().length > 0)
      .slice(-12)
      .map(({ role, text }) => ({ role, text: text.slice(0, 4000) }));
    setMessages((previous) => [...previous.slice(-18), { role: 'user', text: message }]);
    setInput('');
    setBusy(true);
    setError('');
    try {
      let reply: Reply;
      for (let attempt = 0; ; attempt += 1) {
        if (abort.signal.aborted || tokenRef.current !== token) return;
        try {
          reply = await postJson<Reply>(
            endpoints.dataPlaygroundCopilotChat,
            { message, history },
            { signal: abort.signal, headers: { Authorization: `Bearer ${token}` } }
          );
          break;
        } catch (failure) {
          // Only an explicit Stop permits retrying the workspace cleanup conflict.
          // Provider failures and request rate limits are left for the visitor.
          if (
            !retryCleanup ||
            attempt >= 3 ||
            !(failure instanceof ApiError) ||
            failure.status !== 409
          )
            throw failure;
          await waitForCleanup(abort.signal);
        }
      }
      if (tokenRef.current !== token || abort.signal.aborted) return;
      setMessages((previous) => [...previous, { role: 'assistant', ...reply }]);
    } catch (failure) {
      if (tokenRef.current === token && abortRef.current === abort && !abort.signal.aborted) {
        setError(
          failure instanceof Error ? failure.message : 'The copilot could not reply. Try again.'
        );
      }
    } finally {
      if (tokenRef.current === token && abortRef.current === abort) {
        abortRef.current = null;
        setBusy(false);
      }
    }
  }

  async function apply(proposal: Proposal) {
    const token = session?.token;
    if (!token || busy || resolved[proposal.id]) return;
    setBusy(true);
    setApplying(true);
    setError('');
    try {
      const applied = await confirm(proposal.id);
      if (tokenRef.current !== token) return;
      if (applied)
        setResolved((previous) => ({ ...previous, [proposal.id]: 'Applied to this workspace.' }));
      else setError('The change could not be applied. Review the workspace status and try again.');
    } catch (failure) {
      if (tokenRef.current === token)
        setError(failure instanceof Error ? failure.message : 'Could not apply the change.');
    } finally {
      if (tokenRef.current === token) {
        setApplying(false);
        setBusy(false);
      }
    }
  }

  return (
    <section className="lab-copilot" aria-labelledby="data-copilot-title">
      <div className="lab-copilot-heading">
        <span className="lab-eyebrow">Pi Agent SDK</span>
        <h2 id="data-copilot-title">Data Copilot</h2>
        <p>Investigate data, explain execution, and propose changes with visible tool evidence.</p>
      </div>
      <dl className="lab-copilot-context">
        <div>
          <dt>Workspace</dt>
          <dd>{state?.scenario_id ?? 'Not created'}</dd>
        </div>
        <div>
          <dt>Consumer lag</dt>
          <dd>{state?.streaming.backlog ?? '—'}</dd>
        </div>
        <div>
          <dt>Catalog</dt>
          <dd>Engine {catalog.engine_version}</dd>
        </div>
      </dl>
      {!session && <p>Create an isolated workspace in Overview to start investigating.</p>}
      {available === null && <p role="status">Checking copilot availability…</p>}
      {available === false && (
        <p role="status">
          The model connection is unavailable. You can still operate the lab and query SQL directly.
        </p>
      )}
      {messages.length === 0 && (
        <div className="lab-copilot-starters" aria-label="Suggested investigations">
          {starters.map((prompt) => (
            <button
              key={prompt}
              disabled={!session || !available || busy}
              onClick={() => void ask(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}
      <div
        className="lab-copilot-messages"
        role="log"
        aria-label="Copilot conversation"
        aria-live="polite"
      >
        {messages.map((message, index) => (
          <article key={index} className={`lab-copilot-message lab-copilot-${message.role}`}>
            <strong>{message.role === 'user' ? 'You' : 'Data Copilot'}</strong>
            <ChatMarkdown text={message.text} />
            {message.events
              ?.filter((event) => event.type !== 'tool_start')
              .map((event, eventIndex) => (
                <details key={eventIndex} className="lab-copilot-evidence">
                  <summary>
                    {event.tool.replaceAll('_', ' ')}
                    {event.ok === false ? ' · failed' : ''}
                  </summary>
                  {event.result !== undefined ? (
                    <pre>{JSON.stringify(event.result, null, 2)}</pre>
                  ) : (
                    <p>
                      Tool execution {event.ok === false ? 'failed' : 'completed'} in this
                      workspace.
                    </p>
                  )}
                </details>
              ))}
            {message.proposals?.map((proposal) => (
              <div key={proposal.id} className="lab-copilot-proposal">
                <strong>Proposed: {proposal.action.action.replaceAll('_', ' ')}</strong>
                <p>{proposal.reason}</p>
                <details>
                  <summary>Review exact settings</summary>
                  <pre>{JSON.stringify(proposal.action, null, 2)}</pre>
                </details>
                {resolved[proposal.id] ? (
                  <p role="status">{resolved[proposal.id]}</p>
                ) : (
                  <>
                    <button
                      className="lab-primary"
                      disabled={busy || runtimeLoading}
                      onClick={() => void apply(proposal)}
                    >
                      Apply change
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        setResolved((previous) => ({ ...previous, [proposal.id]: 'Dismissed.' }))
                      }
                    >
                      Dismiss
                    </button>
                  </>
                )}
              </div>
            ))}
            {message.limited && (
              <p>The investigation reached its execution limit. Narrow the next question.</p>
            )}
          </article>
        ))}
      </div>
      {busy && (
        <p role="status">
          {applying ? 'Applying approved change…' : 'Investigating with lab tools…'}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {runtimeError && <p role="alert">{runtimeError}</p>}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void ask();
        }}
      >
        <label htmlFor="lab-copilot-question">Ask about this workspace</label>
        <textarea
          id="lab-copilot-question"
          value={input}
          maxLength={4000}
          rows={3}
          placeholder="Why is consumer lag increasing?"
          onChange={(event) => setInput(event.target.value)}
        />
        <button
          className="lab-primary"
          type="submit"
          disabled={!session || !available || busy || !input.trim()}
        >
          Investigate
        </button>
        {busy && !applying && (
          <button
            type="button"
            onClick={() => {
              stoppedWorkspaceRef.current = session?.token ?? null;
              abortRef.current?.abort();
              abortRef.current = null;
              setBusy(false);
            }}
          >
            Stop
          </button>
        )}
      </form>
      <p className="lab-copilot-note">
        Queries are read-only. Proposed changes require your click and affect only this temporary
        workspace.
      </p>
    </section>
  );
}
