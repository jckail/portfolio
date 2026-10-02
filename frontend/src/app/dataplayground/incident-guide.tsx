import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { useRuntime } from './use-runtime';
import './incident-guide.css';

import type { RuntimeAction, RuntimeState } from './runtime-types';

type Incident = 'lag' | 'publication';
interface Step {
  title: string;
  explanation: string;
  button: string;
  request: (state: RuntimeState) => RuntimeAction;
  observe: (before: RuntimeState, after: RuntimeState) => { complete: boolean; detail: string };
}
const count = (value: number) => value.toLocaleString('en-US');
const guides: Record<Incident, { name: string; description: string; steps: Step[] }> = {
  lag: {
    name: 'Consumer lag and recovery',
    description:
      'Hold consumption, create a bounded backlog, then recover by advancing offsets. Each button makes one request.',
    steps: [
      {
        title: 'Stop background production',
        explanation: 'Stop new background batches so the recovery experiment has a bounded log.',
        button: 'Guide: stop producer',
        request: () => ({ action: 'producer_stop' }),
        observe: (_, after) => ({
          complete: !after.streaming.producer_running,
          detail: `Producer ${after.streaming.producer_running ? 'running' : 'stopped'}.`,
        }),
      },
      {
        title: 'Pause consumption',
        explanation: 'A paused consumer leaves produced records waiting at the partition offsets.',
        button: 'Guide: pause consumer',
        request: () => ({ action: 'consumer_pause' }),
        observe: (_, after) => ({
          complete: after.streaming.consumer_paused,
          detail: `Consumer ${after.streaming.consumer_paused ? 'paused' : 'running'}; ${count(after.streaming.backlog)} records waiting.`,
        }),
      },
      {
        title: 'Produce one controlled batch',
        explanation:
          'Append up to 10 records without injected faults, using the current partition count. Existing log contents remain.',
        button: 'Guide: produce lag batch',
        request: (state) => ({
          action: 'produce',
          batch_size: 10,
          rate_per_second: state.streaming.rate_per_second,
          partitions: state.streaming.partitions.length,
          duplicate_rate: 0,
          invalid_rate: 0,
        }),
        observe: (before, after) => ({
          complete:
            after.streaming.consumer_paused &&
            !after.streaming.producer_running &&
            after.streaming.produced > before.streaming.produced &&
            after.streaming.backlog > before.streaming.backlog,
          detail: `Produced ${count(before.streaming.produced)} → ${count(after.streaming.produced)}; backlog ${count(before.streaming.backlog)} → ${count(after.streaming.backlog)}.`,
        }),
      },
      {
        title: 'Drain and verify recovery',
        explanation:
          'Drain up to 500 records per click. Repeat until backlog reaches zero. Consumption stays paused; inserts, duplicates, and quarantine explain the outcomes.',
        button: 'Guide: drain recovery batch',
        request: () => ({ action: 'consumer_drain', limit: 500 }),
        observe: (before, after) => {
          const complete =
            !after.streaming.producer_running &&
            after.streaming.consumer_paused &&
            after.streaming.backlog === 0;
          const recovered = complete
            ? after.streaming.consumed > before.streaming.consumed
              ? 'Recovery drain verified. '
              : 'Verified already recovered; this action confirmed an empty backlog without additional processing attempts. '
            : '';
          return {
            complete,
            detail: `${recovered}Backlog ${count(before.streaming.backlog)} → ${count(after.streaming.backlog)}; consumer attempts ${count(before.streaming.consumed)} → ${count(after.streaming.consumed)}. Producer ${after.streaming.producer_running ? 'running' : 'stopped'}; consumer ${after.streaming.consumer_paused ? 'paused' : 'running'}. Cumulative outcomes: ${count(after.streaming.inserted)} inserted, ${count(after.streaming.duplicates)} deduplicated, ${count(after.streaming.quarantined)} quarantined.`,
          };
        },
      },
    ],
  },
  publication: {
    name: 'Failed publication and repair',
    description:
      'Observe a validation failure block publication, then remove the injected failure and verify a reconciled publication.',
    steps: [
      {
        title: 'Inject a permanent validation failure',
        explanation:
          'Run the actual workspace DAG. Validation should fail and its dependent publication task should be blocked.',
        button: 'Guide: run failing DAG',
        request: () => ({ action: 'dag_run', failure: 'permanent' }),
        observe: (_, after) => ({
          complete:
            after.dag_trace.some(
              (task) => task.task_id === 'validate' && task.status === 'failed'
            ) &&
            after.dag_trace.some(
              (task) => task.task_id === 'publish' && task.status === 'blocked'
            ) &&
            !after.dag_published &&
            after.dag_fingerprint === null,
          detail: `Failed tasks: ${
            after.dag_trace
              .filter((task) => task.status === 'failed')
              .map((task) => task.task_id)
              .join(', ') || 'none'
          }; blocked tasks: ${
            after.dag_trace
              .filter((task) => task.status === 'blocked')
              .map((task) => task.task_id)
              .join(', ') || 'none'
          }. Publication ${after.dag_published ? 'published' : 'not published'}.`,
        }),
      },
      {
        title: 'Remove the injected failure and rerun',
        explanation:
          'Reexecute the DAG with no injected fault. Publication requires successful tasks, executed SQL contracts, and reconciliation.',
        button: 'Guide: run repaired DAG',
        request: () => ({ action: 'dag_run', failure: 'none' }),
        observe: (_, after) => {
          const tests = after.model_runs.flatMap((model) => model.tests);
          return {
            complete:
              after.dag_published &&
              !after.dag_stale &&
              !after.models_stale &&
              !!after.dag_fingerprint &&
              after.dag_trace.length > 0 &&
              after.dag_trace.every((task) => task.status === 'success') &&
              after.model_runs.length > 0 &&
              after.model_runs.every((model) => model.status === 'success') &&
              tests.length > 0 &&
              tests.every((test) => test.status === 'pass'),
            detail: `Publication ${after.dag_published ? 'published in memory' : 'not published'}; ${tests.filter((test) => test.status === 'pass').length} / ${tests.length} contracts pass. Fingerprint: ${after.dag_fingerprint || 'None'}.`,
          };
        },
      },
    ],
  },
};

function Guide() {
  const { state, loading, action } = useRuntime();
  const [incident, setIncident] = useState<Incident>('lag');
  const [checkpoints, setCheckpoints] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState('');
  const actionButton = useRef<HTMLButtonElement>(null);
  const status = useRef<HTMLDivElement>(null);
  const focusOwnership = useRef<{
    origin: HTMLButtonElement;
    owned: boolean;
  } | null>(null);
  const guide = guides[incident];
  const current = checkpoints.length;
  useEffect(() => {
    const movedFocus = (event: FocusEvent) => {
      const ownership = focusOwnership.current;
      if (ownership && event.target !== ownership.origin && event.target !== document.body)
        ownership.owned = false;
    };
    const movedPointer = (event: PointerEvent) => {
      const ownership = focusOwnership.current;
      if (ownership && !ownership.origin.contains(event.target as Node)) ownership.owned = false;
    };
    document.addEventListener('focusin', movedFocus);
    document.addEventListener('pointerdown', movedPointer);
    return () => {
      document.removeEventListener('focusin', movedFocus);
      document.removeEventListener('pointerdown', movedPointer);
      focusOwnership.current = null;
    };
  }, []);
  useLayoutEffect(() => {
    const ownership = focusOwnership.current;
    if (pending || loading || !ownership) return;
    focusOwnership.current = null;
    // Disabling or removing the old button may leave body focused. A move to
    // another control or a pointer click elsewhere gives up the handoff.
    if (
      ownership.owned &&
      (document.activeElement === ownership.origin || document.activeElement === document.body)
    )
      (actionButton.current || status.current)?.focus();
  }, [current, pending, loading]);
  async function runStep(origin: HTMLButtonElement) {
    if (!state || loading || pending || current >= guide.steps.length) return;
    const ownership = {
      origin,
      owned: document.activeElement === origin,
    };
    focusOwnership.current = ownership;
    const step = guide.steps[current];
    setPending(true);
    setFeedback('');
    try {
      const after = await action(step.request(state));
      if (focusOwnership.current !== ownership) return;
      if (!after) {
        setFeedback(
          'No successful action result was received. Review the workspace error and retry this step.'
        );
        return;
      }
      const observed = step.observe(state, after);
      if (observed.complete) {
        setCheckpoints((previous) => [...previous, observed.detail]);
      } else
        setFeedback(
          `${observed.detail} Checkpoint not met; inspect the current state and retry this step.`
        );
    } catch {
      setFeedback('The action could not finish. Review the workspace error and retry this step.');
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="lab-incident-guide" aria-labelledby="incident-guide-title">
      <details>
        <summary id="incident-guide-title">Guided incident investigations</summary>
        <p>
          Make one change, inspect its returned evidence, and verify recovery. Recorded checkpoints
          describe those action responses, not ongoing workspace health.
        </p>
        <label htmlFor="runtime-incident">Investigation</label>
        <select
          id="runtime-incident"
          value={incident}
          disabled={pending || loading}
          onChange={(event) => {
            setIncident(event.target.value as Incident);
            setCheckpoints([]);
            setFeedback('');
          }}
        >
          {Object.entries(guides).map(([id, item]) => (
            <option key={id} value={id}>
              {item.name}
            </option>
          ))}
        </select>
        <p>{guide.description}</p>
        <ol>
          {guide.steps.map((step, index) => (
            <li
              key={`${incident}-${step.title}`}
              aria-current={index === current ? 'step' : undefined}
            >
              <strong>{step.title}</strong>
              <p>{step.explanation}</p>
              {checkpoints[index] ? (
                <p className="lab-incident-checkpoint">Observed checkpoint: {checkpoints[index]}</p>
              ) : index === current ? (
                <button
                  ref={actionButton}
                  disabled={pending || loading}
                  onClick={(event) => void runStep(event.currentTarget)}
                >
                  {pending ? 'Checking action result…' : step.button}
                </button>
              ) : (
                <span className="lab-note">Waiting for the previous checkpoint.</span>
              )}
            </li>
          ))}
        </ol>
        <div ref={status} role="status" tabIndex={-1}>
          {feedback ||
            (current === guide.steps.length
              ? 'Investigation complete: all checkpoints were observed in returned workspace states.'
              : `${current} / ${guide.steps.length} checkpoints observed.`)}
        </div>
        <button
          disabled={pending || loading}
          onClick={() => {
            setCheckpoints([]);
            setFeedback('');
          }}
        >
          Restart guide
        </button>
        <p className="lab-note">
          Restarting the guide does not reset data or settings. These controls change your temporary
          visitor workspace only.
        </p>
      </details>
    </section>
  );
}

export function IncidentGuide() {
  const { session, state } = useRuntime();
  return session ? <Guide key={`${session.token}-${state?.workspace_generation}`} /> : null;
}
