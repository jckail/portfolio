/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Named overflow regions support keyboard scrolling. */
import { useRef, useState } from 'react';

import { compareRunSnapshots, MAX_SNAPSHOTS, snapshotPairDocument } from './run-snapshots';
import { useRunSnapshots, useRuntime } from './use-runtime';
import './run-comparison.css';

import type { RunSnapshot } from './run-snapshots';

const names: Record<string, string> = {
  produced: 'Produced records',
  consumed: 'Consumer attempts',
  inserted: 'Inserted records',
  duplicates: 'Deduplicated attempts',
  quarantined: 'Quarantined attempts',
  accepted: 'Accepted records',
  backlog: 'Consumer lag',
  capacity: 'Log capacity',
  data_revision: 'Data revision',
  producer_running: 'Producer running',
  consumer_paused: 'Consumer paused',
  batch_size: 'Producer batch size',
  rate_per_second: 'Producer batches per second',
  duplicate_rate: 'Duplicate fraction',
  invalid_rate: 'Invalid fraction',
  consumer_batch_size: 'Consumer batch limit',
  consumer_rate_per_second: 'Consumer batches per second',
};
const freshness = (value: boolean | null) =>
  value === null
    ? 'Freshness unavailable'
    : value
      ? 'Stale at capture'
      : 'Not marked stale at capture';
const number = (value: number | null) =>
  value === null ? 'Not present' : value.toLocaleString('en-US');
const difference = (value: number | null) =>
  value === null ? 'Not comparable' : `${value > 0 ? '+' : ''}${value.toLocaleString('en-US')}`;
const contracts = (model: RunSnapshot['models']['runs'][number] | null) =>
  model
    ? `${model.tests.filter((test) => test.status === 'pass').length} / ${model.tests.length} pass · ${model.status}`
    : 'Not present';

function Comparison({
  store,
  loading,
}: {
  store: NonNullable<ReturnType<typeof useRunSnapshots>>;
  loading: boolean;
}) {
  const { snapshots, capture, remove, clear } = store;
  const [label, setLabel] = useState('');
  const [beforeId, setBeforeId] = useState('');
  const [afterId, setAfterId] = useState('');
  const [notice, setNotice] = useState('');
  const nameInput = useRef<HTMLInputElement>(null);
  const before = snapshots.find((snapshot) => snapshot.id === beforeId);
  const after = snapshots.find((snapshot) => snapshot.id === afterId);
  const pair =
    before && after && before.id !== after.id ? compareRunSnapshots(before, after) : null;
  const exportPair = () => {
    if (!before || !after || before.id === after.id) return;
    const data = snapshotPairDocument(before, after);
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dataplayground-run-comparison.json';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const controls = pair?.controls.filter((control) => control.before !== control.after) || [];
  return (
    <section className="lab-run-comparison lab-ops-section" aria-labelledby="run-comparison-title">
      <h3 id="run-comparison-title">Observed-state snapshots</h3>
      <p>
        Capture the last displayed workspace state without making a request or running a task.
        Differences are observations, not evidence that one action caused a change: background
        ticks, replay, and multiple changes may contribute. Consumer attempts are cumulative, not
        unique records.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (capture(label)) {
            setNotice(`Captured ${label.trim()}.`);
            setLabel('');
            nameInput.current?.focus();
          } else
            setNotice(
              'Snapshot not captured. Wait for the current request, use a name, or remove a snapshot at the limit.'
            );
        }}
      >
        <label htmlFor="run-snapshot-name">Snapshot name</label>
        <input
          ref={nameInput}
          id="run-snapshot-name"
          value={label}
          maxLength={60}
          required
          onChange={(event) => setLabel(event.target.value)}
        />
        <button disabled={loading || !label.trim() || snapshots.length >= MAX_SNAPSHOTS}>
          Capture snapshot
        </button>
      </form>
      <p className="lab-note">
        {snapshots.length} / {MAX_SNAPSHOTS} snapshots. Client-clock capture timestamps identify
        observations; they are not server execution times or latency measurements. Replacing,
        resetting, or expiring the workspace clears these captures.
      </p>
      <p role="status">
        {notice ||
          (snapshots.length >= MAX_SNAPSHOTS
            ? 'Snapshot limit reached. Delete a snapshot to capture another.'
            : '')}
      </p>
      {!snapshots.length ? (
        <p>No snapshots captured in this workspace.</p>
      ) : (
        <>
          {snapshots.some((snapshot) => Object.values(snapshot.clipped).some(Boolean)) && (
            <p className="lab-note">
              Some snapshot evidence was bounded. Omitted entries do not represent a complete
              inventory or execution trace.
            </p>
          )}
          <ul className="lab-snapshot-list">
            {snapshots.map((snapshot) => (
              <li key={snapshot.id}>
                <div>
                  <strong>{snapshot.label}</strong>
                  <p>
                    <time dateTime={snapshot.capturedAt}>{snapshot.capturedAt}</time> ·{' '}
                    {snapshot.scenario_id} · Generation {snapshot.workspace_generation ?? 'Unknown'}{' '}
                    · Data revision {snapshot.data_revision ?? 'Unknown'}
                  </p>
                </div>
                <button
                  aria-label={`Delete snapshot ${snapshot.label}`}
                  onClick={() => {
                    remove(snapshot.id);
                    setNotice(`Deleted ${snapshot.label}.`);
                    nameInput.current?.focus();
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={() => {
              clear();
              setBeforeId('');
              setAfterId('');
              setNotice('Snapshots cleared.');
              nameInput.current?.focus();
            }}
          >
            Clear snapshots
          </button>
          <div className="lab-comparison-selectors">
            <label>
              Before snapshot
              <select
                value={before?.id || ''}
                onChange={(event) => setBeforeId(event.target.value)}
              >
                <option value="">Choose a before observation</option>
                {snapshots.map((snapshot) => (
                  <option key={snapshot.id} value={snapshot.id}>
                    {snapshot.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              After snapshot
              <select value={after?.id || ''} onChange={(event) => setAfterId(event.target.value)}>
                <option value="">Choose an after observation</option>
                {snapshots.map((snapshot) => (
                  <option key={snapshot.id} value={snapshot.id}>
                    {snapshot.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {!before || !after ? (
            <p>Choose two snapshots explicitly to compare.</p>
          ) : before.id === after.id ? (
            <p>Select two distinct snapshots.</p>
          ) : (
            pair && (
              <>
                {!pair.compatible ? (
                  <p>{pair.reason}</p>
                ) : (
                  <>
                    <div
                      className="lab-table-scroll"
                      role="region"
                      aria-label="Snapshot counter differences"
                      tabIndex={0}
                    >
                      <table>
                        <caption>
                          Signed differences: after observation minus before observation.
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col">Counter</th>
                            <th scope="col">Before</th>
                            <th scope="col">After</th>
                            <th scope="col">Difference</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pair.metrics.map((metric) => (
                            <tr key={metric.name}>
                              <th scope="row">{names[metric.name] || metric.name}</th>
                              <td>{number(metric.before)}</td>
                              <td>{number(metric.after)}</td>
                              <td>{difference(metric.delta)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <h4>Observed control changes</h4>
                    {controls.length ? (
                      <dl className="lab-comparison-controls">
                        {controls.map((control) => (
                          <div key={control.name}>
                            <dt>{names[control.name] || control.name}</dt>
                            <dd>
                              {String(control.before)} → {String(control.after)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p>No observed control changes.</p>
                    )}
                    <div
                      className="lab-table-scroll"
                      role="region"
                      aria-label="Snapshot table row counts"
                      tabIndex={0}
                    >
                      <table>
                        <caption>
                          Materialized table rows; tables may have different grains.
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col">Table</th>
                            <th scope="col">Before</th>
                            <th scope="col">After</th>
                            <th scope="col">Difference</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pair.tables.map((table) => (
                            <tr key={table.name}>
                              <th scope="row">{table.name}</th>
                              <td>{number(table.before)}</td>
                              <td>{number(table.after)}</td>
                              <td>{difference(table.delta)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div
                      className="lab-table-scroll"
                      role="region"
                      aria-label="Snapshot partition offsets"
                      tabIndex={0}
                    >
                      <table>
                        <caption>Partition observations and signed offset/backlog changes.</caption>
                        <thead>
                          <tr>
                            <th scope="col">Partition</th>
                            <th scope="col">Produced offset before → after</th>
                            <th scope="col">Consumed offset before → after</th>
                            <th scope="col">Lag before → after</th>
                            <th scope="col">Produced / consumed / lag differences</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pair.partitions.map((partition) => (
                            <tr key={partition.partition}>
                              <th scope="row">{partition.partition}</th>
                              <td>
                                {number(partition.before?.produced_offset ?? null)} →{' '}
                                {number(partition.after?.produced_offset ?? null)}
                              </td>
                              <td>
                                {number(partition.before?.consumed_offset ?? null)} →{' '}
                                {number(partition.after?.consumed_offset ?? null)}
                              </td>
                              <td>
                                {number(partition.before?.backlog ?? null)} →{' '}
                                {number(partition.after?.backlog ?? null)}
                              </td>
                              <td>
                                {partition.delta
                                  ? [
                                      partition.delta.produced_offset,
                                      partition.delta.consumed_offset,
                                      partition.delta.backlog,
                                    ]
                                      .map(difference)
                                      .join(' / ')
                                  : 'Not comparable'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
                <h4>Recorded execution evidence</h4>
                <div className="lab-comparison-executions">
                  {[before, after].map((snapshot) => (
                    <article key={snapshot.id}>
                      <h5>{snapshot.label}</h5>
                      <p>
                        DAG:{' '}
                        {snapshot.dag.trace.length
                          ? snapshot.dag.published
                            ? 'Published in memory'
                            : 'Not published'
                          : 'Not run'}{' '}
                        · {freshness(snapshot.dag.stale)} · Input revision{' '}
                        {snapshot.dag.input_revision ?? 'Unknown / not run'}
                      </p>
                      <p>
                        Fingerprint: <code>{snapshot.dag.fingerprint || 'None'}</code>
                      </p>
                      {snapshot.dag.trace.length > 0 && (
                        <ul>
                          {snapshot.dag.trace.map((task, index) => (
                            <li key={`${task.task_id}-${index}`}>
                              {task.task_id}: {task.status} ·{' '}
                              {task.attempt ? `attempt ${task.attempt}` : 'not attempted'}
                            </li>
                          ))}
                        </ul>
                      )}
                      {!snapshot.models.runs.length && <p>No recorded SQL model runs.</p>}
                      <p>
                        SQL models: {freshness(snapshot.models.stale)} · Input revision{' '}
                        {snapshot.models.input_revision ?? 'Unknown / not run'}
                      </p>
                    </article>
                  ))}
                </div>
                {pair.compatible && (
                  <div
                    className="lab-table-scroll"
                    role="region"
                    aria-label="Snapshot model contracts"
                    tabIndex={0}
                  >
                    <table>
                      <caption>Recorded SQL model rows and contract outcomes.</caption>
                      <thead>
                        <tr>
                          <th scope="col">Model</th>
                          <th scope="col">Before rows</th>
                          <th scope="col">After rows</th>
                          <th scope="col">Difference</th>
                          <th scope="col">Before contracts</th>
                          <th scope="col">After contracts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pair.models.map((model) => (
                          <tr key={model.name}>
                            <th scope="row">{model.name}</th>
                            <td>{number(model.before?.row_count ?? null)}</td>
                            <td>{number(model.after?.row_count ?? null)}</td>
                            <td>{difference(model.row_count_delta)}</td>
                            <td>{contracts(model.before)}</td>
                            <td>{contracts(model.after)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <button onClick={exportPair}>Download comparison evidence</button>
              </>
            )
          )}
        </>
      )}
    </section>
  );
}
export function RunComparison() {
  const store = useRunSnapshots();
  const { loading } = useRuntime();
  return store ? <Comparison store={store} loading={loading} /> : null;
}
