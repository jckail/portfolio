import { messageCost, type ModelPrice } from './pricing';

import type { Dataset } from './data';

export interface Totals {
  messages: number;
  inTokens: number;
  outTokens: number;
  cost: number;
}

const empty = (): Totals => ({ messages: 0, inTokens: 0, outTokens: 0, cost: 0 });

function priceMap(prices: ModelPrice[]): Map<string, ModelPrice> {
  return new Map(prices.map((p) => [p.id, p]));
}

export function costOf(
  m: { modelId: string; inTokens: number; outTokens: number },
  pm: Map<string, ModelPrice>
): number {
  const p = pm.get(m.modelId);
  return p ? messageCost(p, m.inTokens, m.outTokens) : 0;
}

function add(t: Totals, inTokens: number, outTokens: number, cost: number) {
  t.messages += 1;
  t.inTokens += inTokens;
  t.outTokens += outTokens;
  t.cost += cost;
}

export function byThread(ds: Dataset, prices: ModelPrice[], upToMinute = 1440): Record<string, Totals> {
  const pm = priceMap(prices);
  const out: Record<string, Totals> = {};
  for (const t of ds.threads) out[t.id] = empty();
  for (const m of ds.messages) if (m.minute < upToMinute) add(out[m.threadId], m.inTokens, m.outTokens, costOf(m, pm));
  return out;
}

export function byModel(ds: Dataset, prices: ModelPrice[], upToMinute = 1440): Record<string, Totals> {
  const pm = priceMap(prices);
  const out: Record<string, Totals> = {};
  for (const p of prices) out[p.id] = empty();
  for (const m of ds.messages) if (m.minute < upToMinute && out[m.modelId]) add(out[m.modelId], m.inTokens, m.outTokens, costOf(m, pm));
  return out;
}

/** 24 hourly buckets. */
export function byHour(ds: Dataset, prices: ModelPrice[], upToMinute = 1440): Totals[] {
  const pm = priceMap(prices);
  const out = Array.from({ length: 24 }, empty);
  for (const m of ds.messages) if (m.minute < upToMinute) add(out[Math.floor(m.minute / 60)], m.inTokens, m.outTokens, costOf(m, pm));
  return out;
}

export function grandTotal(rows: Totals[]): Totals {
  return rows.reduce((a, r) => {
    a.messages += r.messages;
    a.inTokens += r.inTokens;
    a.outTokens += r.outTokens;
    a.cost += r.cost;
    return a;
  }, empty());
}
