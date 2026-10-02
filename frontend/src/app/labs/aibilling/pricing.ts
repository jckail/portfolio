/** Prices are USD per million tokens. Names are generic placeholders, not vendor price lists. */
export interface ModelPrice {
  id: string;
  label: string;
  inputPerM: number;
  outputPerM: number;
}

/** "small" mirrors the default token prices in the project's sample .env ($0.00000025 / $0.00000075 per token). */
export const DEFAULT_PRICES: ModelPrice[] = [
  { id: 'small', label: 'Small model', inputPerM: 0.25, outputPerM: 0.75 },
  { id: 'medium', label: 'Medium model', inputPerM: 3, outputPerM: 15 },
  { id: 'large', label: 'Large model', inputPerM: 15, outputPerM: 75 },
];

export function messageCost(price: ModelPrice, inTokens: number, outTokens: number): number {
  return (inTokens * price.inputPerM + outTokens * price.outputPerM) / 1_000_000;
}

/** Parse a user-typed price; anything invalid or negative becomes 0. */
export function parsePrice(raw: string): number {
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 100000) : 0;
}

export function formatUsd(n: number): string {
  const digits = Math.abs(n) > 0 && Math.abs(n) < 0.01 ? 6 : 4;
  return `$${n.toFixed(digits)}`;
}

export function formatInt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}
