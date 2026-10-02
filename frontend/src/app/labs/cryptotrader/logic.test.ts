import { describe, expect, it } from 'vitest';

import {
  ASSETS,
  backtest,
  DAYS,
  drawdownSeries,
  gaussian,
  generateSeries,
  linePath,
  mulberry32,
  pct,
  sampleRows,
  signals,
  sma,
  type Params,
} from './logic';

const base: Params = { strategy: 'crossover', fast: 10, slow: 30, feeBps: 10 };

describe('prng and series', () => {
  it('is deterministic per seed and differs between seeds', () => {
    const a = mulberry32(5);
    const b = mulberry32(5);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(generateSeries(1, ASSETS[0])).toEqual(generateSeries(1, ASSETS[0]));
    expect(generateSeries(1, ASSETS[0])).not.toEqual(generateSeries(2, ASSETS[0]));
  });

  it('gives each asset its own positive series of the right length', () => {
    const coin = generateSeries(7, ASSETS[0]);
    const metal = generateSeries(7, ASSETS[2]);
    expect(coin).toHaveLength(DAYS);
    expect(coin.every(v => v > 0 && Number.isFinite(v))).toBe(true);
    expect(coin).not.toEqual(metal);
  });

  it('gaussian draws are finite with a sane mean', () => {
    const r = mulberry32(3);
    const xs = Array.from({ length: 2000 }, () => gaussian(r));
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(xs.every(Number.isFinite)).toBe(true);
    expect(Math.abs(mean)).toBeLessThan(0.15);
  });
});

describe('indicators', () => {
  it('computes a simple moving average with NaN warm-up', () => {
    const out = sma([1, 2, 3, 4, 5], 3);
    expect(out.slice(0, 2).every(Number.isNaN)).toBe(true);
    expect(out.slice(2)).toEqual([2, 3, 4]);
  });

  it('crossover is long only while fast > slow', () => {
    const prices = [...Array(40).fill(10), ...Array(40).fill(20)];
    const s = signals(prices, { ...base, fast: 3, slow: 10 });
    expect(s[20]).toBe(0);
    expect(s[45]).toBe(1);
  });

  it('momentum compares to the price N days ago', () => {
    const s = signals([1, 2, 3, 2, 1], { ...base, strategy: 'momentum', fast: 2 });
    expect(s).toEqual([0, 0, 1, 0, 0]);
  });
});

describe('backtest', () => {
  const rising = Array.from({ length: 120 }, (_, i) => 100 + i);

  it('has no look-ahead: a signal on day t only earns from day t+1', () => {
    const prices = [100, 100, 100, 200, 200, 200];
    // momentum fast=1 -> signal on day 3 (200 > 100), applied from day 4: the jump on day 3 is missed.
    const r = backtest(prices, { strategy: 'momentum', fast: 1, slow: 2, feeBps: 0 });
    expect(r.equity[3]).toBe(100);
    expect(r.equity[5]).toBeCloseTo(100, 6);
  });

  it('captures a steady uptrend and charges fees', () => {
    const free = backtest(rising, { ...base, feeBps: 0 });
    const costly = backtest(rising, { ...base, feeBps: 100 });
    expect(free.stats.totalReturn).toBeGreaterThan(0);
    expect(costly.stats.totalReturn).toBeLessThan(free.stats.totalReturn);
    expect(free.trades.at(-1)?.open).toBe(true);
  });

  it('logs closed and open trades with consistent stats', () => {
    const prices = generateSeries(11, ASSETS[0]);
    const r = backtest(prices, base);
    expect(r.equity).toHaveLength(prices.length);
    expect(r.stats.trades).toBe(r.trades.length);
    expect(r.stats.maxDrawdown).toBeLessThanOrEqual(0);
    expect(r.stats.exposure).toBeGreaterThanOrEqual(0);
    expect(r.stats.exposure).toBeLessThanOrEqual(1);
    for (const t of r.trades) expect(t.exitDay).toBeGreaterThanOrEqual(t.entryDay);
  });

  it('reports no win rate when nothing closed', () => {
    const r = backtest(rising, { strategy: 'momentum', fast: 5, slow: 10, feeBps: 0 });
    expect(r.stats.winRate).toBeNull();
  });

  it('computes win rate over closed trades', () => {
    const prices = [100, 100, 110, 120, 90, 80, 80, 100, 130, 120, 100, 90];
    const r = backtest(prices, { strategy: 'momentum', fast: 1, slow: 2, feeBps: 0 });
    const closed = r.trades.filter(t => !t.open);
    expect(closed.length).toBeGreaterThan(0);
    expect(r.stats.winRate).toBeCloseTo(closed.filter(t => t.returnPct > 0).length / closed.length, 9);
  });

  it('is reproducible', () => {
    const prices = generateSeries(3, ASSETS[1]);
    expect(backtest(prices, base)).toEqual(backtest(prices, base));
  });
});

describe('helpers', () => {
  it('drawdown is 0 at new highs and negative below', () => {
    expect(drawdownSeries([100, 110, 99, 120])).toEqual([0, 0, 99 / 110 - 1, 0]);
  });

  it('formats percentages with sign', () => {
    expect(pct(0.1234)).toBe('+12.3%');
    expect(pct(-0.05)).toBe('-5.0%');
    expect(pct(0)).toBe('0.0%');
  });

  it('breaks the path at NaN gaps', () => {
    const d = linePath([Number.NaN, 1, 2, Number.NaN, 3], i => i, v => v);
    expect(d).toBe('M1.0 1.0L2.0 2.0M4.0 3.0');
  });

  it('samples rows monthly and always includes the last day', () => {
    const prices = generateSeries(1, ASSETS[2], 100);
    const rows = sampleRows(prices, backtest(prices, base));
    expect(rows[0].day).toBe(0);
    expect(rows.at(-1)?.day).toBe(99);
  });
});
