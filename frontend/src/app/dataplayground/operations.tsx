/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Named overflow regions support keyboard scrolling. */
import { useEffect, useId, useState } from 'react';

import { useRuntime } from './use-runtime';
import './operations.css';

import type { QueryResult, RuntimeAction, RuntimeState } from './runtime-types';
import type { Catalog } from './types';

const format = (value: number) => value.toLocaleString('en-US');
const flowName = (id: string) =>
  ({
    producer: 'Produced records',
    backlog: 'Backlog',
    consumed: 'Consumed records',
    consumer_attempts: 'Consumer attempts',
    inserted: 'Inserted',
    deduplicated: 'Deduplicated',
    quarantined: 'Quarantined',
  })[id] || id;

/** Use one scale per accounting boundary, including zero-valued outcomes. */
export function flowBands(links: RuntimeState['flow']) {
  const total = links.reduce((sum, link) => sum + link.value, 0);
  let offset = 0;
  return links.map((link, index) => {
    const height = total ? (link.value / total) * 120 : 0;
    const sourceY = 40 + Math.max(0, links.length - 1) * 12 + offset;
    const targetY = 40 + index * 24 + offset;
    offset += height;
    return {
      ...link,
      total,
      height,
      sourceY,
      targetY,
      path: `M 190 ${sourceY} C 290 ${sourceY}, 360 ${targetY}, 460 ${targetY} L 460 ${targetY + height} C 360 ${targetY + height}, 290 ${sourceY + height}, 190 ${sourceY + height} Z`,
    };
  });
}

function FlowDiagram({ state }: { state: RuntimeState }) {
  const uid = useId();
  const groups = [...new Set(state.flow.map((link) => link.source))];
  return (
    <section className="lab-ops-section" aria-labelledby={`${uid}-title`}>
      <h3 id={`${uid}-title`}>Data movement</h3>
      <p>
        Band widths show counts within each accounting boundary. Produced records become backlog or
        consumed records. Consumer attempts become inserts, duplicates, or quarantine; replay can
        increase attempts.
      </p>
      {groups.map((source) => {
        const bands = flowBands(state.flow.filter((link) => link.source === source));
        const total = bands[0]?.total || 0;
        const sourceTop = 40 + Math.max(0, bands.length - 1) * 12;
        return (
          <div
            className="lab-flow-scroll"
            role="region"
            aria-label={`${flowName(source)} flow diagram`}
            tabIndex={0}
            key={source}
          >
            <svg
              viewBox="0 0 700 240"
              role="img"
              aria-labelledby={`${uid}-${source}-title`}
              aria-describedby={`${uid}-${source}-desc`}
            >
              <title id={`${uid}-${source}-title`}>
                {flowName(source)}: {format(total)} total
              </title>
              <desc id={`${uid}-${source}-desc`}>
                {bands.map((band) => `${flowName(band.target)}: ${band.value}`).join('. ')}. Exact
                counts are in the data movement table.
              </desc>
              {bands
                .filter((band) => band.value > 0)
                .map((band, index) => (
                  <path
                    className={`lab-flow-band lab-flow-band-${index}`}
                    key={band.target}
                    d={band.path}
                  />
                ))}
              <rect
                className="lab-flow-node"
                x="174"
                y={sourceTop}
                width="16"
                height={total ? 120 : 1}
              />
              <text x="162" y={sourceTop + 48} textAnchor="end">
                {flowName(source)}
              </text>
              <text x="162" y={sourceTop + 68} textAnchor="end">
                {format(total)}
              </text>
              {bands.map((band) => (
                <g key={band.target}>
                  <rect
                    className="lab-flow-node"
                    x="460"
                    y={band.targetY}
                    width="16"
                    height={Math.max(1, band.height)}
                  />
                  <text x="490" y={band.targetY + Math.max(12, band.height / 2)}>
                    {flowName(band.target)}: {format(band.value)}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        );
      })}
      <div
        className="lab-table-scroll"
        role="region"
        aria-label="Data movement counts"
        tabIndex={0}
      >
        <table>
          <caption>Exact link counts from the current workspace, including zero outcomes.</caption>
          <thead>
            <tr>
              <th scope="col">From</th>
              <th scope="col">To</th>
              <th scope="col">Records</th>
            </tr>
          </thead>
          <tbody>
            {state.flow.map((link) => (
              <tr key={`${link.source}-${link.target}`}>
                <th scope="row">{flowName(link.source)}</th>
                <td>{flowName(link.target)}</td>
                <td>{format(link.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function WorkspaceControls({ catalog, view }: { catalog: Catalog; view: string }) {
  const { state, loading, error, create, refresh } = useRuntime();
  const [scenario, setScenario] = useState(catalog.runs[0]?.scenario.id || 'baseline');
  const currentScenario = state?.scenario_id;
  useEffect(() => {
    if (currentScenario) setScenario(currentScenario);
  }, [currentScenario]);
  return (
    <section className="lab-runtime-workspace" aria-label="Visitor workspace">
      <div>
        <h3>{state ? 'Your workspace' : 'Create an isolated workspace'}</h3>
        <p>
          {state
            ? `${state.scenario_id} · workspace state refreshes while this page is visible`
            : 'Start with a saved event sample. Your queries and changes stay in this visitor workspace.'}
        </p>
      </div>
      <div className="lab-runtime-create">
        <label htmlFor={`runtime-scenario-${view}`}>Workspace scenario</label>
        <select
          id={`runtime-scenario-${view}`}
          disabled={loading}
          value={scenario}
          onChange={(event) => setScenario(event.target.value)}
        >
          {catalog.runs.map((run) => (
            <option key={run.id} value={run.scenario.id}>
              {run.scenario.name}
            </option>
          ))}
        </select>
        <button
          className="lab-primary"
          disabled={loading || !catalog.runs.length}
          onClick={() => void create(scenario)}
        >
          {loading && !state
            ? 'Creating workspace…'
            : state
              ? 'Replace workspace'
              : 'Create workspace'}
        </button>
        {state && (
          <button disabled={loading} onClick={() => void refresh()}>
            Refresh workspace
          </button>
        )}
      </div>
      {error && (
        <p className="lab-error" role="alert">
          {error}
        </p>
      )}
      <p className="lab-note">
        Temporary SQLite warehouse and local event log. Starts from a saved sample; separate from
        full lifecycle totals.
      </p>
      <details className="lab-runtime-scope">
        <summary>Runtime scope</summary>
        {state && <p>{state.runtime}</p>}
        <p>
          Requests refresh idle expiry. Expiration or a server process restart clears the workspace.
          Background production needs server CPU; sessions are process-local and are not shared
          across replicas. No external Airflow, Kafka, or dbt service is connected.
        </p>
        {state && (
          <p>
            Current idle expiry: {format(state.expires_in_seconds)} seconds without further
            requests.
          </p>
        )}
      </details>
    </section>
  );
}

function OverviewMetrics({ state }: { state: RuntimeState }) {
  const tests = state.model_runs.flatMap((model) => model.tests);
  const events = state.tables.find((table) => table.name === 'events');
  return (
    <section aria-label="Workspace metrics" className="lab-overview-metrics">
      <dl>
        <div>
          <dt>Produced records</dt>
          <dd>{format(state.streaming.produced)}</dd>
        </div>
        <div>
          <dt>Consumer lag</dt>
          <dd>{format(state.streaming.backlog)}</dd>
        </div>
        <div>
          <dt>Warehouse event rows</dt>
          <dd>{events ? format(events.row_count) : 'Unavailable'}</dd>
        </div>
        <div>
          <dt>Model contracts</dt>
          <dd>
            {tests.length
              ? `${tests.filter((test) => test.status === 'pass').length} / ${tests.length} pass`
              : 'Not run'}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function StreamingControls({ state }: { state: RuntimeState }) {
  const { action, loading } = useRuntime();
  const stream = state.streaming;
  const [batch, setBatch] = useState(stream.batch_size);
  const [rate, setRate] = useState(stream.rate_per_second);
  const [partitions, setPartitions] = useState(stream.partitions.length);
  const [duplicates, setDuplicates] = useState(stream.duplicate_rate);
  const [invalid, setInvalid] = useState(stream.invalid_rate);
  const [limit, setLimit] = useState(stream.consumer_batch_size);
  const [consumerRate, setConsumerRate] = useState(stream.consumer_rate_per_second);
  useEffect(() => {
    setBatch(stream.batch_size);
    setRate(stream.rate_per_second);
    setPartitions(stream.partitions.length);
    setDuplicates(stream.duplicate_rate);
    setInvalid(stream.invalid_rate);
    setLimit(stream.consumer_batch_size);
    setConsumerRate(stream.consumer_rate_per_second);
  }, [
    stream.batch_size,
    stream.rate_per_second,
    stream.partitions.length,
    stream.duplicate_rate,
    stream.invalid_rate,
    stream.consumer_batch_size,
    stream.consumer_rate_per_second,
  ]);
  const settings = {
    batch_size: batch,
    rate_per_second: rate,
    partitions,
    duplicate_rate: duplicates,
    invalid_rate: invalid,
  };
  return (
    <section className="lab-ops-section" aria-labelledby="runtime-stream-title">
      <h3 id="runtime-stream-title">Producer and consumer</h3>
      <p>
        Production appends partitioned records. Consumption advances offsets and inserts valid new
        event IDs. Replay resets offsets; draining or resuming then processes the same log again.
      </p>
      <p className="lab-runtime-status" role="status">
        Producer {stream.producer_running ? 'running' : 'stopped'} · Consumer{' '}
        {stream.consumer_paused ? 'paused' : 'running'} · {format(stream.backlog)} records waiting ·{' '}
        {format(stream.produced)} / {format(stream.capacity)} log capacity
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!loading) void action({ action: 'produce', ...settings });
        }}
      >
        <fieldset disabled={loading}>
          <legend>Producer settings</legend>
          <div className="lab-ops-fields">
            <label>
              Batch size
              <input
                type="number"
                min="1"
                max="100"
                required
                value={batch}
                onChange={(event) => setBatch(event.target.valueAsNumber)}
              />
            </label>
            <label>
              Producer batches per second
              <input
                type="number"
                min="1"
                max="50"
                required
                value={rate}
                onChange={(event) => setRate(event.target.valueAsNumber)}
              />
            </label>
            <label>
              Partitions
              <input
                type="number"
                min="1"
                max="8"
                required
                disabled={stream.produced > 0}
                value={partitions}
                onChange={(event) => setPartitions(event.target.valueAsNumber)}
              />
            </label>
            <label>
              Duplicate fraction
              <input
                type="number"
                min="0"
                max="0.2"
                step="any"
                required
                value={duplicates}
                onChange={(event) => setDuplicates(event.target.valueAsNumber)}
              />
            </label>
            <label>
              Invalid fraction
              <input
                type="number"
                min="0"
                max="0.2"
                step="any"
                required
                value={invalid}
                onChange={(event) => setInvalid(event.target.valueAsNumber)}
              />
            </label>
          </div>
          <p className="lab-note">
            Fault injection follows deterministic intervals. Reset the workspace to change
            partitions after production begins.
          </p>
          <div className="lab-ops-buttons">
            <button type="submit">Produce one batch</button>
            <button
              type="submit"
              onClick={(event) => {
                const form = event.currentTarget.form;
                if (form?.checkValidity()) {
                  event.preventDefault();
                  void action({ action: 'producer_start', ...settings });
                }
              }}
            >
              Start producer
            </button>
            <button type="button" onClick={() => void action({ action: 'producer_stop' })}>
              Stop producer
            </button>
          </div>
        </fieldset>
      </form>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!loading) void action({ action: 'consumer_drain', limit });
        }}
      >
        <fieldset disabled={loading}>
          <legend>Consumer settings</legend>
          <div className="lab-ops-fields">
            <label>
              Consumer batch limit
              <input
                type="number"
                min="1"
                max="500"
                required
                value={limit}
                onChange={(event) => setLimit(event.target.valueAsNumber)}
              />
            </label>
            <label>
              Consumer batches per second
              <input
                type="number"
                min="1"
                max="50"
                required
                value={consumerRate}
                onChange={(event) => setConsumerRate(event.target.valueAsNumber)}
              />
            </label>
          </div>
          <div className="lab-ops-buttons">
            <button type="submit">Drain one batch</button>
            <button
              type="submit"
              onClick={(event) => {
                if (event.currentTarget.form?.checkValidity()) {
                  event.preventDefault();
                  void action({ action: 'consumer_resume', limit, rate_per_second: consumerRate });
                }
              }}
            >
              Resume consumer
            </button>
            <button type="button" onClick={() => void action({ action: 'consumer_pause' })}>
              Pause consumer
            </button>
            <button type="button" onClick={() => void action({ action: 'consumer_replay' })}>
              Replay consumer log
            </button>
            <button type="button" onClick={() => void action({ action: 'reset' })}>
              Reset workspace
            </button>
          </div>
        </fieldset>
      </form>
      <div className="lab-table-scroll" role="region" aria-label="Partition offsets" tabIndex={0}>
        <table>
          <caption>Current offsets and remaining backlog by partition.</caption>
          <thead>
            <tr>
              <th scope="col">Partition</th>
              <th scope="col">Produced offset</th>
              <th scope="col">Consumed offset</th>
              <th scope="col">Backlog</th>
            </tr>
          </thead>
          <tbody>
            {stream.partitions.map((partition) => (
              <tr key={partition.partition}>
                <th scope="row">{partition.partition}</th>
                <td>{partition.produced_offset}</td>
                <td>{partition.consumed_offset}</td>
                <td>{partition.backlog}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Executions({ state }: { state: RuntimeState }) {
  const { action, loading } = useRuntime();
  const [failure, setFailure] = useState<NonNullable<RuntimeAction['failure']>>('none');
  return (
    <section className="lab-ops-section" aria-labelledby="runtime-execution-title">
      <h3 id="runtime-execution-title">Execute the current workspace</h3>
      <p>
        These callbacks operate on current SQLite rows. They are separate from the saved
        architecture traces and the lifecycle experiment.
      </p>
      <label htmlFor="runtime-dag-failure">DAG failure injection</label>
      <select
        id="runtime-dag-failure"
        value={failure}
        disabled={loading}
        onChange={(event) => setFailure(event.target.value as typeof failure)}
      >
        <option value="none">No injected failure</option>
        <option value="transient">Transient analytics failure</option>
        <option value="permanent">Permanent validation failure</option>
      </select>
      <div className="lab-ops-buttons">
        <button disabled={loading} onClick={() => void action({ action: 'dag_run', failure })}>
          Run workspace DAG
        </button>
        <button disabled={loading} onClick={() => void action({ action: 'models_run' })}>
          Build SQL models
        </button>
      </div>
      {state.dag_trace.length ? (
        <>
          <p>
            Publication: {state.dag_published ? 'published in memory' : 'not published'}.
            Fingerprint: <code>{state.dag_fingerprint || 'None'}</code>
          </p>
          <div
            className="lab-table-scroll"
            role="region"
            aria-label="Workspace DAG trace"
            tabIndex={0}
          >
            <table>
              <caption>Actual workspace execution attempts and blocked dependencies.</caption>
              <thead>
                <tr>
                  <th scope="col">Task</th>
                  <th scope="col">Attempt</th>
                  <th scope="col">Status</th>
                  <th scope="col">Detail</th>
                </tr>
              </thead>
              <tbody>
                {state.dag_trace.map((entry, index) => (
                  <tr key={`${entry.task_id}-${index}`}>
                    <th scope="row">{entry.task_id}</th>
                    <td>{entry.attempt || 'Not attempted'}</td>
                    <td>{entry.status}</td>
                    <td>{entry.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p>No workspace DAG has run yet.</p>
      )}
      <div className="lab-runtime-models">
        {state.model_runs.map((model) => (
          <details key={model.name}>
            <summary>
              {model.name}: {model.status} · {format(model.row_count)} rows
            </summary>
            <p>Source: {model.source}</p>
            <pre>
              <code>{model.sql}</code>
            </pre>
            {model.tests.map((test) => (
              <div key={test.name}>
                <p>
                  {test.name}: {test.status} · {test.failed_rows} failed rows
                </p>
                <pre>
                  <code>{test.sql}</code>
                </pre>
              </div>
            ))}
          </details>
        ))}
      </div>
    </section>
  );
}

const presets = [
  { name: 'Count events', sql: 'SELECT COUNT(*) AS event_count FROM events;' },
  {
    name: 'Revenue by event type',
    sql: 'SELECT event_type, COUNT(*) AS events, SUM(amount_cents) AS revenue_cents FROM events GROUP BY event_type;',
  },
  {
    name: 'Purchase relationships',
    sql: 'SELECT s.name AS shopper, p.name AS product, b.quantity FROM purchases b JOIN shoppers s ON s.id = b.customer_id JOIN products p ON p.id = b.product_id ORDER BY b.id;',
  },
];

function SQLConsole({ state }: { state: RuntimeState }) {
  const { query, loading, session } = useRuntime();
  const [sql, setSql] = useState(presets[0].sql);
  const [rowLimit, setRowLimit] = useState(100);
  const [result, setResult] = useState<QueryResult | null>(null);
  useEffect(() => setResult(null), [session?.token]);
  return (
    <section className="lab-ops-section" aria-labelledby="runtime-sql-title">
      <h3 id="runtime-sql-title">Query SQLite</h3>
      <p>
        Run a single read-only SELECT or WITH query over your current workspace. Row limits and
        execution budgets keep queries bounded.
      </p>
      <div className="lab-ops-buttons" aria-label="SQL presets">
        {presets.map((preset) => (
          <button key={preset.name} disabled={loading} onClick={() => setSql(preset.sql)}>
            {preset.name}
          </button>
        ))}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setResult(null);
          void query({ sql, row_limit: rowLimit }).then((next) => {
            if (next) setResult(next);
          });
        }}
      >
        <label htmlFor="runtime-sql">SQL query</label>
        <textarea
          id="runtime-sql"
          required
          maxLength={20000}
          value={sql}
          onChange={(event) => setSql(event.target.value)}
          spellCheck={false}
          rows={7}
        />
        <label htmlFor="runtime-row-limit">Result row limit</label>
        <input
          id="runtime-row-limit"
          type="number"
          required
          min="1"
          max="500"
          value={rowLimit}
          onChange={(event) => setRowLimit(event.target.valueAsNumber)}
        />
        <button className="lab-primary" disabled={loading}>
          {loading ? 'Running query…' : 'Run query'}
        </button>
      </form>
      {result && (
        <>
          <p role="status">
            {result.row_count} rows returned · {result.elapsed_ms.toFixed(2)} ms measured by the
            server
            {result.truncated
              ? ' · Result truncated; narrow the query or increase the row limit.'
              : ''}
          </p>
          <div
            className="lab-table-scroll"
            role="region"
            aria-label="SQL query results"
            tabIndex={0}
          >
            <table>
              <caption>Current query result</caption>
              <thead>
                <tr>
                  {result.columns.map((column, index) => (
                    <th scope="col" key={`${column}-${index}`}>
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, index) => (
                  <tr key={index}>
                    {row.map((value, column) => (
                      <td key={column}>
                        {value === null ? <span aria-label="SQL NULL">NULL</span> : String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {!result.rows.length && <p>The query returned no rows.</p>}
          </div>
        </>
      )}
      <h4>Workspace schema</h4>
      <div className="lab-runtime-schema">
        {state.tables.map((table) => (
          <details key={table.name}>
            <summary>
              {table.name} · {format(table.row_count)} rows
            </summary>
            <p>{table.source}</p>
            <div
              className="lab-table-scroll"
              role="region"
              aria-label={`${table.name} schema`}
              tabIndex={0}
            >
              <table>
                <caption>{table.name} columns</caption>
                <thead>
                  <tr>
                    <th scope="col">Column</th>
                    <th scope="col">Type</th>
                    <th scope="col">Nullable</th>
                    <th scope="col">Key</th>
                  </tr>
                </thead>
                <tbody>
                  {table.columns.map((column) => (
                    <tr key={column.name}>
                      <th scope="row">{column.name}</th>
                      <td>{column.type || 'SQLite inferred'}</td>
                      <td>{column.nullable ? 'Yes' : 'No'}</td>
                      <td>{column.key}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

export function Operations({
  view,
  catalog,
}: {
  view: 'overview' | 'operations' | 'sql';
  catalog: Catalog;
}) {
  const { state, session } = useRuntime();
  return (
    <div className="lab-operations">
      <WorkspaceControls catalog={catalog} view={view} />
      {state &&
        (view === 'overview' ? (
          <>
            <OverviewMetrics state={state} />
            <FlowDiagram state={state} />
            <section className="lab-ops-section">
              <h3>Workspace inventory</h3>
              <div
                className="lab-table-scroll"
                role="region"
                aria-label="Workspace inventory"
                tabIndex={0}
              >
                <table>
                  <caption>Current tables and their materialized row counts.</caption>
                  <thead>
                    <tr>
                      <th scope="col">Table</th>
                      <th scope="col">Rows</th>
                      <th scope="col">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.tables.map((table) => (
                      <tr key={table.name}>
                        <th scope="row">{table.name}</th>
                        <td>{format(table.row_count)}</td>
                        <td>{table.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : view === 'operations' ? (
          <>
            <StreamingControls key={session?.token} state={state} />
            <Executions state={state} />
            <details className="lab-runtime-logs">
              <summary>Workspace activity ({state.logs.length} entries)</summary>
              <ol>
                {state.logs.map((entry) => (
                  <li key={entry.sequence}>
                    <strong>
                      {entry.component}: {entry.status}
                    </strong>
                    <p>{entry.detail}</p>
                  </li>
                ))}
              </ol>
            </details>
          </>
        ) : (
          <SQLConsole state={state} />
        ))}
    </div>
  );
}
