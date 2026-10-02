import { useId, useMemo, useState } from 'react';

import {
  ASSETS,
  backtest,
  generateSeries,
  linePath,
  pct,
  sampleRows,
  sma,
  type Params,
  type StrategyKind,
} from './logic';

import './cryptotrader.css';

const W = 720;
const H = 240;
const PAD = { l: 48, r: 12, t: 12, b: 24 };

interface Line {
  label: string;
  values: number[];
  className: string;
}

interface Marker {
  day: number;
  value: number;
  kind: 'buy' | 'sell';
}

function Chart({
  title,
  summary,
  lines,
  markers = [],
  format,
  zeroBase = false,
}: {
  title: string;
  summary: string;
  lines: Line[];
  markers?: Marker[];
  format: (v: number) => string;
  zeroBase?: boolean;
}) {
  const id = useId();
  const all = lines.flatMap(l => l.values).filter(v => !Number.isNaN(v));
  const min = Math.min(...all);
  let max = Math.max(...all);
  if (zeroBase) max = Math.max(max, 0);
  if (max === min) max = min + 1;
  const n = lines[0].values.length;
  const x = (i: number) => PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - min) / (max - min)) * (H - PAD.t - PAD.b);
  const ticks = [min, (min + max) / 2, max];
  return (
    <figure className="ct-chart">
      <figcaption id={`${id}-t`}>{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-t ${id}-d`} preserveAspectRatio="xMidYMid meet">
        <desc id={`${id}-d`}>{summary}</desc>
        {ticks.map(t => (
          <g key={t}>
            <line className="ct-grid" x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} />
            <text className="ct-axis" x={PAD.l - 6} y={y(t) + 4} textAnchor="end">
              {format(t)}
            </text>
          </g>
        ))}
        <text className="ct-axis" x={PAD.l} y={H - 6}>
          day 0
        </text>
        <text className="ct-axis" x={W - PAD.r} y={H - 6} textAnchor="end">
          day {n - 1}
        </text>
        {lines.map(l => (
          <path key={l.label} className={`ct-line ${l.className}`} d={linePath(l.values, x, y)} />
        ))}
        {markers.map(m =>
          m.kind === 'buy' ? (
            <path key={`b${m.day}`} className="ct-mark ct-buy" d={`M${x(m.day) - 5} ${y(m.value) + 9}h10l-5 -10z`} />
          ) : (
            <path key={`s${m.day}`} className="ct-mark ct-sell" d={`M${x(m.day) - 5} ${y(m.value) - 9}h10l-5 10z`} />
          ),
        )}
      </svg>
      <ul className="ct-legend" aria-label={`${title} legend`}>
        {lines.map(l => (
          <li key={l.label}>
            <svg width="28" height="10" aria-hidden="true">
              <line x1="0" x2="28" y1="5" y2="5" className={`ct-line ${l.className}`} />
            </svg>
            {l.label}
          </li>
        ))}
        {markers.length > 0 && (
          <li>
            <span aria-hidden="true">▲ buy, ▼ sell</span>
            <span className="ct-sr">Triangles mark buys and sells</span>
          </li>
        )}
      </ul>
    </figure>
  );
}

const PIPELINE_REPO = [
  { name: 'Collect', text: 'Python scripts call public web APIs (CryptoCompare, CoinMarketCap, Alpha Vantage, Quandl) in multiple threads.' },
  { name: 'Store', text: 'Results are written as gzipped JSON and saved to an S3 bucket with boto3.' },
  { name: 'Catalog', text: 'An AWS Glue crawler catalogs the bucket.' },
  { name: 'Query', text: 'Amazon Athena runs SQL over it, for example joins of gold and crypto prices.' },
  { name: 'Analyze', text: 'Pandas and scikit-learn experiments. The repo says the model parts were never finished.' },
];

const PIPELINE_DEMO = [
  { name: 'Generate', text: 'A seeded random walk makes a fake price series.' },
  { name: 'Features', text: 'Moving averages or a lookback return.' },
  { name: 'Signal', text: 'A rule says long or flat each day.' },
  { name: 'Backtest', text: 'Replay the rule on the fake prices, with costs.' },
];

function Pipeline({ title, steps, label }: { title: string; steps: { name: string; text: string }[]; label: string }) {
  return (
    <section className="ct-pipeline" aria-label={label}>
      <h3>{title}</h3>
      <ol>
        {steps.map(s => (
          <li key={s.name}>
            <strong>{s.name}</strong>
            <span>{s.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

const DEFAULTS = { seed: 2018, assetId: ASSETS[0].id, strategy: 'crossover' as StrategyKind, fast: 10, slow: 40, feeBps: 10 };

export default function CryptoTraderLab() {
  const [seed, setSeed] = useState(DEFAULTS.seed);
  const [assetId, setAssetId] = useState(DEFAULTS.assetId);
  const [strategy, setStrategy] = useState<StrategyKind>(DEFAULTS.strategy);
  const [fast, setFast] = useState(DEFAULTS.fast);
  const [slow, setSlow] = useState(DEFAULTS.slow);
  const [feeBps, setFeeBps] = useState(DEFAULTS.feeBps);

  const asset = ASSETS.find(a => a.id === assetId) ?? ASSETS[0];
  const effSlow = Math.max(slow, fast + 1);
  const params: Params = { strategy, fast, slow: effSlow, feeBps };

  const prices = useMemo(() => generateSeries(seed, asset), [seed, asset]);
  const result = useMemo(() => backtest(prices, params), [prices, strategy, fast, effSlow, feeBps]); // eslint-disable-line react-hooks/exhaustive-deps
  const fastMa = useMemo(() => sma(prices, fast), [prices, fast]);
  const slowMa = useMemo(() => sma(prices, effSlow), [prices, effSlow]);
  const rows = useMemo(() => sampleRows(prices, result), [prices, result]);

  const markers: Marker[] = result.trades.flatMap(t => {
    const m: Marker[] = [{ day: Math.max(0, t.entryDay - 1), value: t.entryPrice, kind: 'buy' }];
    if (!t.open) m.push({ day: t.exitDay - 1, value: t.exitPrice, kind: 'sell' });
    return m;
  });
  const s = result.stats;
  const reset = () => {
    setSeed(DEFAULTS.seed);
    setAssetId(DEFAULTS.assetId);
    setStrategy(DEFAULTS.strategy);
    setFast(DEFAULTS.fast);
    setSlow(DEFAULTS.slow);
    setFeeBps(DEFAULTS.feeBps);
  };
  const priceLines: Line[] = [{ label: 'Synthetic price', values: prices, className: 'ct-l-price' }];
  if (strategy === 'crossover') {
    priceLines.push({ label: `Fast average (${fast} d)`, values: fastMa, className: 'ct-l-fast' });
    priceLines.push({ label: `Slow average (${effSlow} d)`, values: slowMa, className: 'ct-l-slow' });
  }

  return (
    <div className="ct-lab">
      <header>
        <p className="ct-eyebrow">Archived project · educational demo</p>
        <h1>Algo Crypto</h1>
        <p className="ct-lede">
          A synthetic, interactive illustration of the idea behind my 2017-2018 side project: turn market data into a
          rule-based trading signal and test it.
        </p>
      </header>

      <div className="ct-notice" role="note">
        <strong>Read this first.</strong> Everything here is generated, fake data. It runs only in your browser; there is no
        live data, no network calls and no trading. This is an educational illustration, not financial advice, and not the
        original project&apos;s algorithm (the repository does not contain a finished trading strategy).
      </div>

      <section aria-labelledby="ct-about" className="ct-panel">
        <h2 id="ct-about">About the original project</h2>
        <p>
          The public repository (jckail/crypto_trader) is an archived 2018 Python 3.6 project. Its &quot;alpha&quot; part
          collects data from public APIs in a multithreaded Pandas and boto3 pipeline and stores it in S3 so it can be
          queried with Athena. Its &quot;omega&quot; part, for machine learning, is described by the author as unfinished
          and was removed from the public repo. Crypto prices were meant to be compared with sources such as social
          mentions, metals prices and US stock prices.
        </p>
        <Pipeline title="What the repository does" steps={PIPELINE_REPO} label="Original data pipeline" />
        <Pipeline title="What this demo does instead" steps={PIPELINE_DEMO} label="Demo pipeline" />
      </section>

      <section aria-labelledby="ct-controls" className="ct-panel">
        <h2 id="ct-controls">Strategy controls</h2>
        <div className="ct-controls">
          <label>
            Synthetic market
            <select value={assetId} onChange={e => setAssetId(e.target.value)}>
              {ASSETS.map(a => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Rule
            <select value={strategy} onChange={e => setStrategy(e.target.value as StrategyKind)}>
              <option value="crossover">Moving-average crossover</option>
              <option value="momentum">Momentum (price vs N days ago)</option>
            </select>
          </label>
          <label>
            {strategy === 'crossover' ? 'Fast window' : 'Lookback'}: {fast} days
            <input type="range" min={2} max={50} value={fast} onChange={e => setFast(Number(e.target.value))} />
          </label>
          <label>
            Slow window: {strategy === 'crossover' ? effSlow : 'not used'}
            {strategy === 'crossover' ? ' days' : ''}
            <input
              type="range"
              min={10}
              max={200}
              value={slow}
              disabled={strategy !== 'crossover'}
              onChange={e => setSlow(Number(e.target.value))}
            />
          </label>
          <label>
            Cost per trade: {feeBps} bps
            <input type="range" min={0} max={100} value={feeBps} onChange={e => setFeeBps(Number(e.target.value))} />
          </label>
          <label>
            Random seed
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={999999}
              value={seed}
              onChange={e => {
                const v = Math.floor(Number(e.target.value));
                if (Number.isFinite(v) && v >= 0) setSeed(v);
              }}
            />
          </label>
          <div className="ct-buttons">
            <button type="button" onClick={() => setSeed(Math.floor(Math.random() * 999999))}>
              New random seed
            </button>
            <button type="button" onClick={reset}>
              Reset
            </button>
          </div>
        </div>
        <p className="ct-hint">
          {asset.note} The same seed always produces the same prices. The rule decides at each close and trades the next
          day, so it never sees the future.
        </p>
      </section>

      <section aria-labelledby="ct-results" className="ct-panel">
        <h2 id="ct-results">Backtest on synthetic data</h2>
        <dl className="ct-stats" aria-live="polite">
          <div>
            <dt>Strategy return</dt>
            <dd>{pct(s.totalReturn)}</dd>
          </div>
          <div>
            <dt>Buy and hold</dt>
            <dd>{pct(s.buyHoldReturn)}</dd>
          </div>
          <div>
            <dt>Max drawdown</dt>
            <dd>{pct(s.maxDrawdown)}</dd>
          </div>
          <div>
            <dt>Trades</dt>
            <dd>{s.trades}</dd>
          </div>
          <div>
            <dt>Win rate (closed)</dt>
            <dd>{s.winRate === null ? 'n/a' : pct(s.winRate, 0).replace('+', '')}</dd>
          </div>
          <div>
            <dt>Time invested</dt>
            <dd>{pct(s.exposure, 0).replace('+', '')}</dd>
          </div>
        </dl>

        <Chart
          title="Synthetic price and signals"
          summary={`Synthetic price from ${prices[0].toFixed(0)} to ${prices[prices.length - 1].toFixed(0)} with ${s.trades} trades.`}
          lines={priceLines}
          markers={markers}
          format={v => v.toFixed(0)}
        />
        <Chart
          title="Equity curve (start = 100)"
          summary={`Strategy ends at ${result.equity[result.equity.length - 1].toFixed(1)}, buy and hold at ${result.buyHold[result.buyHold.length - 1].toFixed(1)}.`}
          lines={[
            { label: 'Strategy', values: result.equity, className: 'ct-l-strategy' },
            { label: 'Buy and hold', values: result.buyHold, className: 'ct-l-hold' },
          ]}
          format={v => v.toFixed(0)}
        />
        <Chart
          title="Strategy drawdown"
          summary={`Deepest fall from a previous peak: ${pct(s.maxDrawdown)}.`}
          lines={[{ label: 'Drawdown', values: result.drawdown, className: 'ct-l-dd' }]}
          format={v => pct(v, 0)}
          zeroBase
        />

        <details className="ct-details">
          <summary>Data table (about one row per month)</summary>
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- scrollable region must be keyboard reachable */}
          <div className="ct-scroll" role="region" aria-label="Monthly values table" tabIndex={0}>
            <table>
              <caption>Synthetic values sampled every 21 trading days</caption>
              <thead>
                <tr>
                  <th scope="col">Day</th>
                  <th scope="col">Price</th>
                  <th scope="col">Strategy</th>
                  <th scope="col">Buy and hold</th>
                  <th scope="col">Drawdown</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.day}>
                    <th scope="row">{r.day}</th>
                    <td>{r.price.toFixed(2)}</td>
                    <td>{r.strategy.toFixed(1)}</td>
                    <td>{r.buyHold.toFixed(1)}</td>
                    <td>{pct(r.drawdown)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>

        <h3>Trade log</h3>
        {result.trades.length === 0 ? (
          <p>This rule made no trades with these settings.</p>
        ) : (
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- scrollable region must be keyboard reachable
          <div className="ct-scroll" role="region" aria-label="Trade log" tabIndex={0}>
            <table>
              <caption>Trades from the synthetic backtest, net of costs</caption>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Buy day</th>
                  <th scope="col">Sell day</th>
                  <th scope="col">Buy price</th>
                  <th scope="col">Sell price</th>
                  <th scope="col">Result</th>
                </tr>
              </thead>
              <tbody>
                {result.trades.map((t, i) => (
                  <tr key={t.entryDay}>
                    <th scope="row">{i + 1}</th>
                    <td>{t.entryDay}</td>
                    <td>{t.open ? 'still open' : t.exitDay}</td>
                    <td>{t.entryPrice.toFixed(2)}</td>
                    <td>{t.exitPrice.toFixed(2)}</td>
                    <td>{pct(t.returnPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="ct-hint">
          Results on random data say nothing about real markets. A rule can look good on one seed and bad on the next;
          try a few seeds.
        </p>
      </section>
    </div>
  );
}
