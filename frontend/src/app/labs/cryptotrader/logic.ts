/**
 * Pure logic for the Algo Crypto demo: seeded synthetic price series, two
 * simple rule-based strategies and a long/flat backtest. Educational
 * illustration only; none of this is the original project's algorithm.
 */

export type StrategyKind = 'crossover' | 'momentum';

export interface AssetSpec {
  id: string;
  label: string;
  /** Plain-language note on what the synthetic series imitates (not real data). */
  note: string;
  start: number;
  /** Daily volatility of the random shocks. */
  vol: number;
  /** Long-run daily drift scale. */
  drift: number;
  /** How persistent the slowly varying trend is (0..1). */
  persistence: number;
}

export const ASSETS: AssetSpec[] = [
  { id: 'coin', label: 'SYN-COIN (crypto-like)', note: 'High volatility, strong trending regimes.', start: 100, vol: 0.035, drift: 0.004, persistence: 0.97 },
  { id: 'equity', label: 'SYN-EQUITY (NASDAQ-like)', note: 'Moderate volatility, gentle trends.', start: 100, vol: 0.014, drift: 0.0015, persistence: 0.985 },
  { id: 'metal', label: 'SYN-METAL (commodity-like)', note: 'Lower volatility, slow cycles.', start: 100, vol: 0.009, drift: 0.001, persistence: 0.99 },
];

export const DAYS = 500;

/** mulberry32: small deterministic PRNG. Same seed, same sequence. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal draw (Box-Muller) from a uniform source. */
export function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function assetOffset(id: string): number {
  return [...id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

/**
 * Geometric random walk whose drift is a slowly varying AR(1) process, so the
 * series has trending regimes a moving-average rule can sometimes catch.
 */
export function generateSeries(seed: number, asset: AssetSpec, days: number = DAYS): number[] {
  const rand = mulberry32((seed * 2654435761 + assetOffset(asset.id)) >>> 0);
  const prices = [asset.start];
  let drift = 0;
  for (let i = 1; i < days; i++) {
    drift = asset.persistence * drift + (1 - asset.persistence) * asset.drift * 12 * gaussian(rand);
    const ret = drift + asset.vol * gaussian(rand);
    prices.push(Math.max(0.01, prices[i - 1] * Math.exp(ret)));
  }
  return prices;
}

/** Simple moving average; entries before a full window are NaN. */
export function sma(values: number[], window: number): number[] {
  const out: number[] = new Array(values.length).fill(Number.NaN);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= window) sum -= values[i - window];
    if (i >= window - 1) out[i] = sum / window;
  }
  return out;
}

export interface Params {
  strategy: StrategyKind;
  fast: number;
  slow: number;
  /** Cost per position change, in basis points of traded value. */
  feeBps: number;
}

/**
 * Target position (1 long, 0 flat) decided at each day's close. It is only
 * ever applied from the next day, so the backtest has no look-ahead.
 */
export function signals(prices: number[], p: Params): number[] {
  const out: number[] = new Array(prices.length).fill(0);
  if (p.strategy === 'crossover') {
    const f = sma(prices, p.fast);
    const s = sma(prices, p.slow);
    for (let i = 0; i < prices.length; i++) {
      out[i] = !Number.isNaN(f[i]) && !Number.isNaN(s[i]) && f[i] > s[i] ? 1 : 0;
    }
  } else {
    for (let i = p.fast; i < prices.length; i++) out[i] = prices[i] > prices[i - p.fast] ? 1 : 0;
  }
  return out;
}

export interface Trade {
  entryDay: number;
  exitDay: number;
  entryPrice: number;
  exitPrice: number;
  /** Net return of the round trip including both fees. */
  returnPct: number;
  open: boolean;
}

export interface Stats {
  totalReturn: number;
  buyHoldReturn: number;
  maxDrawdown: number;
  trades: number;
  winRate: number | null;
  exposure: number;
}

export interface BacktestResult {
  equity: number[];
  buyHold: number[];
  drawdown: number[];
  position: number[];
  trades: Trade[];
  stats: Stats;
}

export function drawdownSeries(equity: number[]): number[] {
  let peak = -Infinity;
  return equity.map(v => {
    peak = Math.max(peak, v);
    return v / peak - 1;
  });
}

export function backtest(prices: number[], p: Params): BacktestResult {
  const sig = signals(prices, p);
  const fee = p.feeBps / 10000;
  const equity = [100];
  const position = [0];
  const trades: Trade[] = [];
  let pos = 0;
  let entry: { day: number; price: number } | null = null;
  let held = 0;

  for (let i = 1; i < prices.length; i++) {
    const target = sig[i - 1]; // decided at yesterday's close
    let eq = equity[i - 1];
    if (target !== pos) {
      eq *= 1 - fee;
      if (target === 1) {
        entry = { day: i, price: prices[i - 1] };
      } else if (entry) {
        trades.push(roundTrip(entry, i, prices[i - 1], fee, false));
        entry = null;
      }
      pos = target;
    }
    if (pos === 1) {
      eq *= prices[i] / prices[i - 1];
      held++;
    }
    equity.push(eq);
    position.push(pos);
  }
  if (entry) trades.push(roundTrip(entry, prices.length - 1, prices[prices.length - 1], fee, true));

  const buyHold = prices.map(v => (v / prices[0]) * 100);
  const closed = trades.filter(t => !t.open);
  const wins = closed.filter(t => t.returnPct > 0).length;
  const dd = drawdownSeries(equity);
  return {
    equity,
    buyHold,
    drawdown: dd,
    position,
    trades,
    stats: {
      totalReturn: equity[equity.length - 1] / 100 - 1,
      buyHoldReturn: buyHold[buyHold.length - 1] / 100 - 1,
      maxDrawdown: Math.min(0, ...dd),
      trades: trades.length,
      winRate: closed.length ? wins / closed.length : null,
      exposure: held / Math.max(1, prices.length - 1),
    },
  };
}

function roundTrip(entry: { day: number; price: number }, exitDay: number, exitPrice: number, fee: number, open: boolean): Trade {
  const gross = exitPrice / entry.price;
  // Entry fee always paid; exit fee only once the position is actually closed.
  const net = gross * (1 - fee) * (open ? 1 : 1 - fee) - 1;
  return { entryDay: entry.day, exitDay, entryPrice: entry.price, exitPrice, returnPct: net, open };
}

export function pct(v: number, digits = 1): string {
  const s = (v * 100).toFixed(digits);
  return `${v > 0 ? '+' : ''}${s}%`;
}

/** Map values to an SVG polyline "points" string, skipping NaN gaps as separate segments. */
export function linePath(values: number[], x: (i: number) => number, y: (v: number) => number): string {
  let d = '';
  let pen = false;
  values.forEach((v, i) => {
    if (Number.isNaN(v)) {
      pen = false;
      return;
    }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
    pen = true;
  });
  return d;
}

/** Month-ish (every 21 trading days) sample rows for the accessible table. */
export function sampleRows(prices: number[], r: BacktestResult, step = 21) {
  const rows: { day: number; price: number; strategy: number; buyHold: number; drawdown: number }[] = [];
  for (let i = 0; i < prices.length; i += step) {
    rows.push({ day: i, price: prices[i], strategy: r.equity[i], buyHold: r.buyHold[i], drawdown: r.drawdown[i] });
  }
  const last = prices.length - 1;
  if (rows[rows.length - 1].day !== last) {
    rows.push({ day: last, price: prices[last], strategy: r.equity[last], buyHold: r.buyHold[last], drawdown: r.drawdown[last] });
  }
  return rows;
}
