import { describe, expect, it } from 'vitest';

import { byHour, byModel, byThread, grandTotal } from './aggregate';
import { generateDataset, THREAD_COUNT } from './data';
import { buildInvoice, invoiceToCsv } from './invoice';
import { pipelineAt } from './pipeline';
import { DEFAULT_PRICES, formatUsd, messageCost, parsePrice } from './pricing';
import { createRng } from './rng';

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = createRng(5);
    const b = createRng(5);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(createRng(6)()).not.toEqual(createRng(5)());
  });
});

describe('pricing', () => {
  it('computes cost per million tokens', () => {
    expect(messageCost(DEFAULT_PRICES[0], 1_000_000, 1_000_000)).toBeCloseTo(1.0);
    expect(messageCost(DEFAULT_PRICES[1], 1000, 0)).toBeCloseTo(0.003);
  });
  it('parses prices defensively', () => {
    expect(parsePrice('2.5')).toBe(2.5);
    expect(parsePrice('abc')).toBe(0);
    expect(parsePrice('-3')).toBe(0);
    expect(parsePrice('1e99')).toBe(100000);
  });
  it('formats small amounts with more digits', () => {
    expect(formatUsd(1.5)).toBe('$1.5000');
    expect(formatUsd(0.000123)).toBe('$0.000123');
  });
});

describe('dataset', () => {
  it('is reproducible and varies by seed', () => {
    expect(generateDataset('steady', 3)).toEqual(generateDataset('steady', 3));
    expect(generateDataset('steady', 3).messages).not.toEqual(generateDataset('steady', 4).messages);
    expect(generateDataset('steady', 3).threads).toHaveLength(THREAD_COUNT);
  });
  it('runaway makes one thread dominate cost', () => {
    const ds = generateDataset('runaway', 1);
    const t = Object.entries(byThread(ds, DEFAULT_PRICES)).sort((a, b) => b[1].cost - a[1].cost);
    expect(t[0][0]).toBe('T-004');
    expect(t[0][1].cost).toBeGreaterThan(t[1][1].cost * 3);
  });
  it('spike concentrates messages around mid-day', () => {
    const ds = generateDataset('spike', 1);
    const inWindow = ds.messages.filter((m) => m.minute >= 720 && m.minute <= 780).length;
    expect(inWindow / ds.messages.length).toBeGreaterThan(0.5);
  });
});

describe('aggregation', () => {
  const ds = generateDataset('steady', 2);
  it('thread, model and hour totals agree', () => {
    const t = grandTotal(Object.values(byThread(ds, DEFAULT_PRICES)));
    const m = grandTotal(Object.values(byModel(ds, DEFAULT_PRICES)));
    const h = grandTotal(byHour(ds, DEFAULT_PRICES));
    expect(t.messages).toBe(ds.messages.length);
    expect(m.cost).toBeCloseTo(t.cost);
    expect(h.cost).toBeCloseTo(t.cost);
  });
  it('responds to price edits and respects the time cut-off', () => {
    const zero = DEFAULT_PRICES.map((p) => ({ ...p, inputPerM: 0, outputPerM: 0 }));
    expect(grandTotal(byHour(ds, zero)).cost).toBe(0);
    expect(grandTotal(byHour(ds, DEFAULT_PRICES, 0)).messages).toBe(0);
  });
});

describe('pipeline', () => {
  it('moves an event through ingest, aggregate and dashboard', () => {
    const ev = [{ at: 1 }];
    expect(pipelineAt(ev, 0).sent).toBe(0);
    expect(pipelineAt(ev, 1)).toMatchObject({ sent: 1, inQueue: 1, onDashboard: 0 });
    expect(pipelineAt(ev, 5)).toMatchObject({ inQueue: 0, aggregatedPending: 1, onDashboard: 0 });
    expect(pipelineAt(ev, 15)).toMatchObject({ inQueue: 0, aggregatedPending: 0, onDashboard: 1, freshnessS: 0 });
    expect(pipelineAt(ev, 20).freshnessS).toBe(5);
  });
});

describe('invoice', () => {
  const ds = generateDataset('steady', 1);
  it('totals selected threads', () => {
    const inv = buildInvoice(ds, DEFAULT_PRICES, ['T-001', 'T-002']);
    expect(inv.lines).toHaveLength(2);
    expect(inv.subtotal).toBeCloseTo(inv.lines[0].amount + inv.lines[1].amount);
    expect(buildInvoice(ds, DEFAULT_PRICES, []).subtotal).toBe(0);
  });
  it('exports csv with a subtotal row and neutralises formulas', () => {
    const inv = buildInvoice(ds, DEFAULT_PRICES, ['T-001']);
    inv.lines[0].description = '=cmd,"x"';
    const csv = invoiceToCsv(inv);
    expect(csv.split('\n')[0]).toContain('amount_usd');
    expect(csv).toContain(`"'=cmd,""x"""`);
    expect(csv).toContain('Subtotal');
  });
});
