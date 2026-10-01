export const THEMES = ['light', 'dark', 'party'] as const;

export type Theme = (typeof THEMES)[number];

/** Narrows an untrusted string (URL param, storage, event detail) to a Theme. */
export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}
