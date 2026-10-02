import { useId, useMemo, useState } from 'react';

import { byHour, byModel, byThread, grandTotal } from './aggregate';
import { generateDataset, SCENARIOS, type Scenario } from './data';
import { buildInvoice, invoiceToCsv } from './invoice';
import { BATCH_INTERVAL_S, pipelineAt, REFRESH_INTERVAL_S, type PipelineEvent } from './pipeline';
import { DEFAULT_PRICES, formatInt, formatUsd, parsePrice, type ModelPrice } from './pricing';
import './lab.css';

function HourChart({ hours }: { hours: { cost: number }[] }) {
  const max = Math.max(...hours.map((h) => h.cost), 1e-9);
  const W = 480;
  const H = 140;
  const bw = W / 24;
  return (
    <svg className="ab-chart" viewBox={`0 0 ${W} ${H + 20}`} role="img" aria-labelledby="ab-hour-title ab-hour-desc">
      <title id="ab-hour-title">Cost per hour</title>
      <desc id="ab-hour-desc">Bar chart of synthetic cost for each of 24 hours. The table below has the exact values.</desc>
      {hours.map((h, i) => {
        const bh = (h.cost / max) * H;
        return <rect key={i} className="ab-bar" x={i * bw + 1} y={H - bh} width={bw - 2} height={bh} />;
      })}
      <line className="ab-axis" x1="0" x2={W} y1={H} y2={H} />
      {[0, 6, 12, 18].map((h) => (
        <text key={h} className="ab-tick" x={h * bw + 2} y={H + 14}>{`${String(h).padStart(2, '0')}:00`}</text>
      ))}
    </svg>
  );
}

export default function AiBillingLab() {
  const uid = useId();
  const [scenario, setScenario] = useState<Scenario>('steady');
  const [seed, setSeed] = useState(1);
  const [prices, setPrices] = useState<ModelPrice[]>(DEFAULT_PRICES);
  const ds = useMemo(() => generateDataset(scenario, seed), [scenario, seed]);
  const threadTotals = useMemo(() => byThread(ds, prices), [ds, prices]);
  const modelTotals = useMemo(() => byModel(ds, prices), [ds, prices]);
  const hours = useMemo(() => byHour(ds, prices), [ds, prices]);
  const total = useMemo(() => grandTotal(hours), [hours]);

  const [selected, setSelected] = useState<string[]>([]);
  const invoice = useMemo(() => buildInvoice(ds, prices, selected), [ds, prices, selected]);

  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [clock, setClock] = useState(0);
  const pipe = pipelineAt(events, clock);

  const maxThread = Math.max(...Object.values(threadTotals).map((t) => t.cost), 1e-9);
  const ranked = [...ds.threads].sort((a, b) => threadTotals[b.id].cost - threadTotals[a.id].cost);
  const scenarioInfo = SCENARIOS.find((s) => s.id === scenario)!;

  const setPrice = (id: string, key: 'inputPerM' | 'outputPerM', raw: string) =>
    setPrices((ps) => ps.map((p) => (p.id === id ? { ...p, [key]: parsePrice(raw) } : p)));

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const downloadCsv = () => {
    const url = URL.createObjectURL(new Blob([invoiceToCsv(invoice)], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'synthetic-invoice.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main id="main" className="ab">
      <h1>AI Chat Billing System: interactive demo</h1>
      <p className="ab-notice" role="note">
        Everything on this page is synthetic data generated in your browser from a seed. Nothing is sent anywhere. The
        numbers are not the project&apos;s real metrics.
      </p>

      <section aria-labelledby={`${uid}-scn`}>
        <h2 id={`${uid}-scn`}>Choose the data</h2>
        <div className="ab-row">
          <label>
            Scenario
            <select value={scenario} onChange={(e) => setScenario(e.target.value as Scenario)}>
              {SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </label>
          <label>
            Seed
            <input type="number" min={1} max={9999} value={seed} onChange={(e) => setSeed(Math.max(1, Math.min(9999, Math.floor(Number(e.target.value)) || 1)))} />
          </label>
        </div>
        <p>{scenarioInfo.blurb} The same scenario and seed always produce the same data.</p>
      </section>

      <section aria-labelledby={`${uid}-price`}>
        <h2 id={`${uid}-price`}>Price table</h2>
        <p>US dollars per million tokens. Edit a price and every total below recalculates. Model names are generic placeholders.</p>
        <div className="ab-scroll">
          <table>
            <thead>
              <tr><th scope="col">Model</th><th scope="col">Input $/M tokens</th><th scope="col">Output $/M tokens</th></tr>
            </thead>
            <tbody>
              {prices.map((p) => (
                <tr key={p.id}>
                  <th scope="row">{p.label}</th>
                  <td><input aria-label={`${p.label} input price per million tokens`} inputMode="decimal" defaultValue={p.inputPerM} onChange={(e) => setPrice(p.id, 'inputPerM', e.target.value)} /></td>
                  <td><input aria-label={`${p.label} output price per million tokens`} inputMode="decimal" defaultValue={p.outputPerM} onChange={(e) => setPrice(p.id, 'outputPerM', e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby={`${uid}-pipe`}>
        <h2 id={`${uid}-pipe`}>Metering pipeline</h2>
        <p>
          Events flow ingest, then aggregate, then dashboard. The simulated clock only moves when you press a button, and
          the {BATCH_INTERVAL_S} s batch and {REFRESH_INTERVAL_S} s refresh values are this demo&apos;s illustrative settings,
          not a measurement.
        </p>
        <div className="ab-row">
          <button type="button" onClick={() => setEvents((e) => [...e, { at: clock }])}>Send a message event</button>
          <button type="button" onClick={() => setClock((c) => c + BATCH_INTERVAL_S)}>Advance {BATCH_INTERVAL_S} s</button>
          <button type="button" onClick={() => { setEvents([]); setClock(0); }}>Reset</button>
        </div>
        <ol className="ab-stages">
          <li><strong>Ingest</strong><span>{pipe.inQueue} waiting for the next batch</span></li>
          <li><strong>Aggregate</strong><span>{pipe.aggregatedPending} waiting for the next dashboard refresh</span></li>
          <li><strong>Dashboard</strong><span>{pipe.onDashboard} visible</span></li>
        </ol>
        <p role="status" className="ab-fresh">
          Simulated time {pipe.clock} s. Dashboard data is {pipe.freshnessS} s old (illustrative), refreshed every {REFRESH_INTERVAL_S} s.
          <progress max={REFRESH_INTERVAL_S} value={pipe.freshnessS} aria-label="Seconds since the last simulated dashboard refresh" />
        </p>
      </section>

      <section aria-labelledby={`${uid}-cost`}>
        <h2 id={`${uid}-cost`}>Cost dashboard</h2>
        <p className="ab-kpis">
          <span>Total <strong>{formatUsd(total.cost)}</strong></span>
          <span>Messages <strong>{formatInt(total.messages)}</strong></span>
          <span>Input tokens <strong>{formatInt(total.inTokens)}</strong></span>
          <span>Output tokens <strong>{formatInt(total.outTokens)}</strong></span>
        </p>

        <h3>By hour</h3>
        <HourChart hours={hours} />
        <details>
          <summary>Hourly data table</summary>
          <div className="ab-scroll">
            <table>
              <thead><tr><th scope="col">Hour</th><th scope="col">Messages</th><th scope="col">Cost</th></tr></thead>
              <tbody>
                {hours.map((h, i) => (
                  <tr key={i}><th scope="row">{String(i).padStart(2, '0')}:00</th><td>{h.messages}</td><td>{formatUsd(h.cost)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>

        <h3>By thread</h3>
        <ul className="ab-bars">
          {ranked.map((t) => (
            <li key={t.id}>
              <span className="ab-bar-label">{t.id} {t.title}</span>
              <span className="ab-track" aria-hidden="true"><span style={{ width: `${(threadTotals[t.id].cost / maxThread) * 100}%` }} /></span>
              <span className="ab-bar-val">{formatUsd(threadTotals[t.id].cost)}</span>
            </li>
          ))}
        </ul>

        <h3>By model</h3>
        <div className="ab-scroll">
          <table>
            <thead><tr><th scope="col">Model</th><th scope="col">Messages</th><th scope="col">Input tokens</th><th scope="col">Output tokens</th><th scope="col">Cost</th></tr></thead>
            <tbody>
              {prices.map((p) => (
                <tr key={p.id}>
                  <th scope="row">{p.label}</th>
                  <td>{modelTotals[p.id].messages}</td>
                  <td>{formatInt(modelTotals[p.id].inTokens)}</td>
                  <td>{formatInt(modelTotals[p.id].outTokens)}</td>
                  <td>{formatUsd(modelTotals[p.id].cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby={`${uid}-inv`}>
        <h2 id={`${uid}-inv`}>Invoice builder</h2>
        <p>Select threads to bill. Each becomes one line item.</p>
        <fieldset>
          <legend>Threads to include</legend>
          <div className="ab-checks">
            {ds.threads.map((t) => (
              <label key={t.id} className="ab-check">
                <input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggle(t.id)} />
                {t.id} {t.title} ({formatUsd(threadTotals[t.id].cost)})
              </label>
            ))}
          </div>
        </fieldset>
        <div className="ab-row">
          <button type="button" onClick={() => setSelected(ds.threads.map((t) => t.id))}>Select all</button>
          <button type="button" onClick={() => setSelected([])}>Clear</button>
        </div>
        <div className="ab-invoice">
          <h3>Invoice (synthetic)</h3>
          {invoice.lines.length === 0 ? (
            <p>No threads selected.</p>
          ) : (
            <div className="ab-scroll">
              <table>
                <thead><tr><th scope="col">Thread</th><th scope="col">Model</th><th scope="col">Messages</th><th scope="col">Tokens in / out</th><th scope="col">Amount</th></tr></thead>
                <tbody>
                  {invoice.lines.map((l) => (
                    <tr key={l.threadId}>
                      <th scope="row">{l.threadId} {l.description}</th>
                      <td>{l.model}</td>
                      <td>{l.messages}</td>
                      <td>{formatInt(l.inTokens)} / {formatInt(l.outTokens)}</td>
                      <td>{formatUsd(l.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><th scope="row" colSpan={4}>Subtotal</th><td>{formatUsd(invoice.subtotal)}</td></tr></tfoot>
              </table>
            </div>
          )}
          <div className="ab-row ab-noprint">
            <button type="button" disabled={invoice.lines.length === 0} onClick={downloadCsv}>Download CSV</button>
            <button type="button" disabled={invoice.lines.length === 0} onClick={() => window.print()}>Print</button>
          </div>
        </div>
      </section>
    </main>
  );
}
