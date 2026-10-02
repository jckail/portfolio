/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Named overflow regions must be keyboard-focusable for horizontal table scrolling. */
import { useEffect, useState } from 'react';

import { useThemeStore } from '../../shared/stores/theme-store';
import { endpoints, getJson, postJson } from '../../shared/utils/api';
import Exploration from './exploration';
import Architecture from './architecture';
import '../../styles/base/theme.css';
import './data-playground.css';

import type { Catalog, RunResult, SimulationConfig } from './types';

const number = (value: number) => value.toLocaleString('en-US');
const money = (cents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(cents / 100);
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const controls: {
  key: keyof SimulationConfig;
  label: string;
  min: number;
  max: number;
  step: number | 'any';
}[] = [
  { key: 'seed', label: 'Random seed', min: 0, max: 2147483647, step: 1 },
  { key: 'days', label: 'Days to simulate', min: 7, max: 90, step: 1 },
  { key: 'daily_signups', label: 'Daily signups', min: 5, max: 100, step: 1 },
  { key: 'activation_rate', label: 'Activation probability', min: 0, max: 1, step: 'any' },
  { key: 'payment_rate', label: 'Payment probability', min: 0, max: 1, step: 'any' },
  { key: 'churn_rate', label: 'Daily churn probability', min: 0, max: 0.2, step: 'any' },
  { key: 'duplicate_rate', label: 'Duplicate probability', min: 0, max: 0.2, step: 'any' },
  { key: 'invalid_rate', label: 'Invalid record probability', min: 0, max: 0.2, step: 'any' },
];

function Revenue({ run, baseline }: { run: RunResult; baseline: RunResult }) {
  const selectedDates = run.daily.map((day) => day.date);
  const baselineWindow = baseline.daily.filter((day) => selectedDates.includes(day.date));
  const ceiling = Math.max(
    1,
    ...run.daily.map((day) => day.revenue_cents),
    ...baselineWindow.map((day) => day.revenue_cents)
  );
  const days = Math.max(run.daily.length, 2);
  const points = (data: RunResult['daily']) =>
    data
      .map(
        (day) =>
          `${60 + (selectedDates.indexOf(day.date) / (days - 1)) * 660},${200 - (day.revenue_cents / ceiling) * 170}`
      )
      .join(' ');
  return (
    <section className="lab-revenue" aria-labelledby="revenue-title">
      <div className="lab-section-heading">
        <div>
          <h2 id="revenue-title">Revenue, day by day</h2>
          <p>Collected subscription payments. Synthetic USD, not MRR.</p>
        </div>
        <span className="lab-legend">
          <span>Selected run</span>
          <span>Baseline</span>
        </span>
      </div>
      {run.daily.length ? (
        <svg
          className="lab-chart"
          viewBox="0 0 750 244"
          role="img"
          aria-labelledby="revenue-chart-title revenue-chart-desc"
        >
          <title id="revenue-chart-title">Daily revenue compared with baseline</title>
          <desc id="revenue-chart-desc">
            Solid line is the selected run; dashed line is baseline. Exact daily amounts are in the
            expandable table below. Baseline is limited to the selected run’s observation dates.
          </desc>
          {[0, 0.5, 1].map((fraction) => (
            <g key={fraction}>
              <line
                x1="60"
                x2="720"
                y1={200 - fraction * 170}
                y2={200 - fraction * 170}
                className="lab-gridline"
              />
              <text x="0" y={205 - fraction * 170}>
                {money(ceiling * fraction).replace('.00', '')}
              </text>
            </g>
          ))}
          <polyline points={points(baselineWindow)} className="lab-line-baseline" />
          <polyline points={points(run.daily)} className="lab-line" />
          <text x="60" y="232">
            {run.daily[0].date}
          </text>
          <text x="720" y="232" textAnchor="end">
            {run.daily[run.daily.length - 1].date}
          </text>
        </svg>
      ) : (
        <p>No daily observations in this run.</p>
      )}
      <details>
        <summary>View daily revenue table</summary>
        <div
          className="lab-table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Daily revenue table"
        >
          <table>
            <caption>Daily collected revenue and active customers</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Selected revenue</th>
                <th scope="col">Baseline revenue</th>
                <th scope="col">Active customers</th>
              </tr>
            </thead>
            <tbody>
              {run.daily.map((day) => (
                <tr key={day.date}>
                  <th scope="row">{day.date}</th>
                  <td>{money(day.revenue_cents)}</td>
                  <td>
                    {baseline.daily.find((base) => base.date === day.date)
                      ? money(baseline.daily.find((base) => base.date === day.date)!.revenue_cents)
                      : 'Unavailable'}
                  </td>
                  <td>{number(day.active_customers)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function Workspace({ catalog }: { catalog: Catalog }) {
  const [run, setRun] = useState(catalog.runs[0]);
  const [config, setConfig] = useState<SimulationConfig>(catalog.runs[0].config);
  const [stageId, setStageId] = useState(catalog.runs[0].pipeline[0]?.id);
  const [eventType, setEventType] = useState('all');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const baseline = catalog.runs.find((item) => item.scenario.id === 'baseline') || catalog.runs[0];
  const stage = run.pipeline.find((item) => item.id === stageId) || run.pipeline[0];
  const events = run.events.filter(
    (event) =>
      (eventType === 'all' || event.event_type === eventType) &&
      Object.values(event).join(' ').toLowerCase().includes(query.toLowerCase())
  );
  const weeks = Math.max(0, ...run.cohorts.map((cohort) => cohort.retention.length));
  const chooseRun = (next: RunResult) => {
    setRun(next);
    setConfig(next.config);
    setError('');
  };
  async function simulate() {
    setBusy(true);
    setError('');
    try {
      setRun(await postJson<RunResult>(endpoints.dataPlaygroundSimulate, config));
    } catch {
      setError(
        'The simulation could not finish. Your current results are preserved. Try running again.'
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="lab-experiment" aria-labelledby="experiment-title">
        <div className="lab-section-heading">
          <h2 id="experiment-title">Choose an experiment</h2>
          <span>
            Seed {run.config.seed} / {run.config.days} days / engine {catalog.engine_version}
          </span>
        </div>
        <div className="lab-scenarios" aria-label="Scenarios">
          {catalog.runs.map((item) => (
            <button
              key={item.id}
              disabled={busy}
              aria-pressed={run.id === item.id}
              onClick={() => chooseRun(item)}
            >
              {item.scenario.name}
            </button>
          ))}
        </div>
        <div className="lab-run-description" aria-live="polite">
          <h3>{run.scenario.name}</h3>
          <p>{run.scenario.description}</p>
        </div>
        <details className="lab-config">
          <summary>Inspect parameters & run your own</summary>
          <p>
            {catalog.live_simulation
              ? 'Change the inputs and run the same Python pipeline. Probabilities are fractions from 0 to 1.'
              : 'These curated runs were generated by the Python pipeline. Inspect their parameters here; custom runs are available locally using the reproduction command below. Probabilities are fractions from 0 to 1.'}
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (catalog.live_simulation && !busy) void simulate();
            }}
          >
            <fieldset disabled={busy || !catalog.live_simulation}>
              <legend>Simulation parameters</legend>
              <div className="lab-controls">
                {controls.map((control) => (
                  <label key={control.key}>
                    {control.label}
                    <input
                      type="number"
                      required
                      min={control.min}
                      max={control.max}
                      step={control.step}
                      value={config[control.key]}
                      onChange={(event) =>
                        setConfig({ ...config, [control.key]: event.target.valueAsNumber })
                      }
                    />
                  </label>
                ))}
              </div>
            </fieldset>
            {catalog.live_simulation && (
              <button className="lab-primary" type="submit" disabled={busy}>
                {busy ? 'Running Python pipeline…' : 'Run simulation'}
              </button>
            )}
          </form>
          {error && (
            <p role="alert" className="lab-error">
              {error}
            </p>
          )}
        </details>
      </section>
      <section id="lab-pipeline" className="lab-pipeline-section" aria-labelledby="pipeline-title">
        <div className="lab-section-heading">
          <div>
            <h2 id="pipeline-title">From event to evidence</h2>
            <p>Select a stage to inspect what crosses the boundary.</p>
          </div>
          <a href="#lab-lineage">Explore the SQL</a>
        </div>
        <ol className="lab-pipeline">
          {run.pipeline.map((item, index) => (
            <li key={item.id}>
              <button onClick={() => setStageId(item.id)} aria-pressed={stage?.id === item.id}>
                <span className="lab-stage-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="lab-stage-name">{item.name}</span>
                <strong>{number(item.output_count)}</strong>
                <span>records out</span>
              </button>
            </li>
          ))}
        </ol>
        {stage && (
          <div className="lab-stage-detail" aria-live="polite">
            <div>
              <h3>{stage.name}</h3>
              <p>{stage.description}</p>
            </div>
            <dl>
              <div>
                <dt>In</dt>
                <dd>{number(stage.input_count)}</dd>
              </div>
              <div>
                <dt>Out</dt>
                <dd>{number(stage.output_count)}</dd>
              </div>
              <div>
                <dt>Rejected</dt>
                <dd>{number(stage.rejected_count)}</dd>
              </div>
            </dl>
          </div>
        )}
      </section>
      <section className="lab-metrics" aria-label="Run metrics compared to baseline">
        {run.config.days !== baseline.config.days && (
          <p className="lab-comparison-note">
            Selected totals cover {run.config.days} days; baseline totals cover{' '}
            {baseline.config.days} days. These are different observation windows.
          </p>
        )}
        {[
          {
            label: 'Collected revenue',
            value: money(run.summary.revenue_cents),
            base: money(baseline.summary.revenue_cents),
          },
          {
            label: 'Signup to paid',
            value: percent(run.summary.conversion_rate),
            base: percent(baseline.summary.conversion_rate),
          },
          {
            label: 'Active customers',
            value: number(run.summary.active_customers),
            base: number(baseline.summary.active_customers),
          },
          {
            label: 'Quality pass rate',
            value: percent(run.summary.quality_pass_rate),
            base: percent(baseline.summary.quality_pass_rate),
          },
        ].map((metric) => (
          <div key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>
              Baseline {metric.base}
              {run.config.days !== baseline.config.days ? ` (${baseline.config.days} days)` : ''}
            </small>
          </div>
        ))}
      </section>
      <div className="lab-analytics">
        <Revenue run={run} baseline={baseline} />
        <section className="lab-funnel" aria-labelledby="funnel-title">
          <h2 id="funnel-title">Where users convert</h2>
          <p>Unique users at each stage.</p>
          <ol>
            {run.funnel.map((item) => (
              <li key={item.stage}>
                <div>
                  <span>{item.stage}</span>
                  <strong>{number(item.users)}</strong>
                </div>
                <div className="lab-funnel-track">
                  <span style={{ width: `${item.rate * 100}%` }} />
                </div>
                <small>{percent(item.rate)} of signups</small>
              </li>
            ))}
          </ol>
          <p className="lab-note">
            {percent(run.summary.churn_rate)} cumulative churn among ever-paying customers.
          </p>
        </section>
      </div>
      <section className="lab-section" aria-labelledby="cohorts-title">
        <div className="lab-section-heading">
          <div>
            <h2 id="cohorts-title">Do customers stay?</h2>
            <p>First-payment cohorts. Retention after each elapsed week.</p>
          </div>
          <span className="lab-note">Stronger color = higher retention</span>
        </div>
        {run.cohorts.length ? (
          <div
            className="lab-table-scroll"
            role="region"
            aria-label="Cohort retention table"
            tabIndex={0}
          >
            <table className="lab-cohorts">
              <caption>
                Paying customer retention; unavailable weeks have not been observed.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Cohort</th>
                  <th scope="col">Customers</th>
                  {Array.from({ length: weeks }, (_, index) => (
                    <th scope="col" key={index}>
                      Week {index}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {run.cohorts.map((cohort) => (
                  <tr key={cohort.cohort}>
                    <th scope="row">{cohort.cohort}</th>
                    <td>{number(cohort.size)}</td>
                    {cohort.retention.map((rate, index) => (
                      <td
                        key={index}
                        className={rate === null ? 'lab-unavailable' : 'lab-heat-cell'}
                        style={
                          rate === null
                            ? undefined
                            : {
                                backgroundColor: `color-mix(in srgb, var(--accent-text) ${Math.round(rate * 35 + 5)}%, var(--page-bg))`,
                                color: 'var(--text-color)',
                              }
                        }
                        title={rate === null ? 'Not yet observed' : undefined}
                      >
                        {rate === null ? (
                          <span aria-label="Not yet observed">—</span>
                        ) : (
                          percent(rate)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No paying cohorts in this run.</p>
        )}
      </section>
      <section className="lab-section" aria-labelledby="quality-title">
        <div className="lab-section-heading">
          <div>
            <h2 id="quality-title">Trust is a pipeline stage</h2>
            <p>Rejected records stay visible. They never contribute to the analytics.</p>
          </div>
          <a href="#lab-events">Inspect accepted events</a>
        </div>
        <div className="lab-quality">
          {run.quality.map((check) => (
            <article key={check.id}>
              <div>
                <span className="lab-status">{check.status === 'pass' ? 'Pass' : 'Warning'}</span>
                <h3>{check.name}</h3>
              </div>
              <p>{check.description}</p>
              <p>
                <strong>{number(check.failed)}</strong> failed / {number(check.checked)} checked
              </p>
            </article>
          ))}
        </div>
        <details>
          <summary>Rejected record sample ({run.quarantined.length})</summary>
          {run.quarantined.length ? (
            <div
              className="lab-table-scroll"
              role="region"
              aria-label="Rejected records"
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    <th scope="col">Event</th>
                    <th scope="col">Type</th>
                    <th scope="col">Rejection reason</th>
                  </tr>
                </thead>
                <tbody>
                  {run.quarantined.map((event, index) => (
                    <tr key={`${event.event_id}-${index}`}>
                      <td>{event.event_id}</td>
                      <td>{event.event_type}</td>
                      <td>{event.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No rejected records in this sample.</p>
          )}
        </details>
      </section>
      <section className="lab-section" id="lab-events" aria-labelledby="events-title">
        <div className="lab-section-heading">
          <div>
            <h2 id="events-title">Look at the raw ingredients</h2>
            <p>A bounded sample of accepted events, not the complete dataset.</p>
          </div>
          <span aria-live="polite">
            {events.length} of {run.events.length} sampled events
          </span>
        </div>
        <div className="lab-event-filters">
          <label>
            Search events
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="User, event, channel, plan…"
            />
          </label>
          <div className="lab-filter-field">
            <label htmlFor="lab-event-type">Event type</label>
            <select
              id="lab-event-type"
              value={eventType}
              onChange={(event) => setEventType(event.target.value)}
            >
              <option value="all">All event types</option>
              {['signup', 'activation', 'payment', 'churn'].map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
        {events.length ? (
          <div
            className="lab-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Accepted event sample"
          >
            <table>
              <thead>
                <tr>
                  {['Event', 'Occurred at', 'User', 'Type', 'Amount', 'Channel', 'Plan'].map(
                    (label) => (
                      <th scope="col" key={label}>
                        {label}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.event_id}>
                    <td>{event.event_id}</td>
                    <td>{event.occurred_at}</td>
                    <td>{event.user_id}</td>
                    <td>
                      <span className="lab-event-type">{event.event_type}</span>
                    </td>
                    <td>{money(event.amount_cents)}</td>
                    <td>{event.channel}</td>
                    <td>{event.plan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="lab-empty">
            <p>No sampled events match these filters.</p>
            <button
              onClick={() => {
                setQuery('');
                setEventType('all');
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
      <section className="lab-section" id="lab-lineage" aria-labelledby="lineage-title">
        <h2 id="lineage-title">A metric is only as good as its definition</h2>
        <p>Follow the definitions back to the SQL executed by the Python pipeline.</p>
        <div className="lab-lineage">
          {run.lineage.map((item) => (
            <details key={item.metric}>
              <summary>{item.metric}</summary>
              <p>{item.definition}</p>
              <p className="lab-note">Source: {item.source}</p>
              <pre>
                <code>{item.sql}</code>
              </pre>
            </details>
          ))}
        </div>
      </section>
      <section className="lab-reproduce">
        <div>
          <h2>Take the experiment apart.</h2>
          <p>
            Seeded Python generation, validation, quarantine, and SQLite analytics. Every number
            starts with a synthetic event.
          </p>
          <a href={catalog.source.repository} target="_blank" rel="noreferrer">
            Read the source on GitHub
          </a>
        </div>
        <div>
          <h3>Reproduce this run</h3>
          <pre>
            <code>{`python -m playground simulate ${controls.map(({ key }) => `--${key.replaceAll('_', '-')} ${run.config[key]}`).join(' ')} --output run.json`}</code>
          </pre>
          <p className="lab-note">
            The JSON includes metrics, lineage, and bounded event samples, not the complete raw
            event stream.
          </p>
          <details>
            <summary>Reproduce the curated catalog</summary>
            <pre>
              <code>{catalog.source.command}</code>
            </pre>
          </details>
          <p className="lab-note">
            Run from the source repository. Run ID: <code>{run.id}</code>
          </p>
        </div>
      </section>
    </>
  );
}

export default function DataPlayground() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  useEffect(() => {
    document.title = 'Data Playground | Jordan Kail';
    const controller = new AbortController();
    setError(false);
    getJson<Catalog>(endpoints.dataPlayground, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setCatalog(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [attempt]);
  return (
    <div className="data-lab">
      <a className="lab-skip" href="#lab-main">
        Skip to experiments
      </a>
      <header className="lab-header">
        <a className="lab-brand" href="/">
          Jordan Kail <span>/ Data Playground</span>
        </a>
        <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
          Use {theme === 'light' ? 'dark' : 'light'} theme
        </button>
      </header>
      <main id="lab-main">
        <div className="lab-intro">
          <div>
            <p className="lab-intro-label">An end-to-end data engineering lab</p>
            <h1>Follow the data.</h1>
            <p>
              From a signup to a business metric. Change the scenario, inspect what breaks, and
              trace the result back to the events and SQL.
            </p>
          </div>
          <aside>
            <span className="lab-synthetic-mark" aria-hidden="true">
              {'{ }'}
            </span>
            <strong>Synthetic by design.</strong>
            <p>
              Reproducible experiments.
              <br />
              No real customer data.
            </p>
          </aside>
        </div>
        {(catalog?.exploration || catalog?.architecture) && (
          <nav className="lab-explore-nav" aria-label="Lab sections">
            <a href="#lab-pipeline">Lifecycle pipeline</a>
            {catalog.architecture && (
              <>
                <a href="#lab-dags">Workflow execution</a>
                <a href="#lab-models">Data models</a>
                <a href="#lab-decisions">Engineering decisions</a>
              </>
            )}
            {catalog.exploration && (
              <>
                <a href="#lab-exploration">Product dataset</a>
                <a href="#lab-graph">Graph relationships</a>
                <a href="#lab-vectors">Vector similarity</a>
              </>
            )}
          </nav>
        )}
        {error ? (
          <div className="lab-empty" role="alert">
            <h2>The experiments could not load.</h2>
            <p>Check your connection and retry.</p>
            <button className="lab-primary" onClick={() => setAttempt((value) => value + 1)}>
              Retry loading experiments
            </button>
          </div>
        ) : !catalog ? (
          <p className="lab-loading" role="status">
            Loading reproducible experiments…
          </p>
        ) : catalog.runs.length ? (
          <Workspace catalog={catalog} />
        ) : (
          <div className="lab-empty">
            <h2>No experiments are available yet.</h2>
            <button onClick={() => setAttempt((value) => value + 1)}>Check again</button>
          </div>
        )}
        {catalog?.exploration && <Exploration dataset={catalog.exploration} />}
        {catalog?.architecture && <Architecture dataset={catalog.architecture} />}
      </main>
      <footer className="lab-footer">
        <a href="/">Back to portfolio</a>
        <span>Built to be inspected.</span>
      </footer>
    </div>
  );
}
