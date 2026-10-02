import { byThread } from './aggregate';

import type { Dataset } from './data';
import type { ModelPrice } from './pricing';

export interface LineItem {
  threadId: string;
  description: string;
  model: string;
  messages: number;
  inTokens: number;
  outTokens: number;
  amount: number;
}

export interface Invoice {
  lines: LineItem[];
  subtotal: number;
}

export function buildInvoice(ds: Dataset, prices: ModelPrice[], selected: string[]): Invoice {
  const totals = byThread(ds, prices);
  const label = new Map(prices.map((p) => [p.id, p.label]));
  const sel = new Set(selected);
  const lines: LineItem[] = ds.threads
    .filter((t) => sel.has(t.id))
    .map((t) => ({
      threadId: t.id,
      description: t.title,
      model: label.get(t.modelId) ?? t.modelId,
      messages: totals[t.id].messages,
      inTokens: totals[t.id].inTokens,
      outTokens: totals[t.id].outTokens,
      amount: totals[t.id].cost,
    }));
  return { lines, subtotal: lines.reduce((s, l) => s + l.amount, 0) };
}

/** Guard against spreadsheet formula injection in exported text cells. */
function cell(v: string | number): string {
  const s = String(v);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function invoiceToCsv(inv: Invoice): string {
  const rows = [['thread', 'description', 'model', 'messages', 'input_tokens', 'output_tokens', 'amount_usd']];
  for (const l of inv.lines) rows.push([l.threadId, l.description, l.model, l.messages, l.inTokens, l.outTokens, l.amount.toFixed(6)] as never);
  rows.push(['', 'Subtotal', '', '', '', '', inv.subtotal.toFixed(6)] as never);
  return rows.map((r) => r.map(cell).join(',')).join('\n') + '\n';
}
