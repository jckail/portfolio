/**
 * First-render content inlined by the server into index.html.
 *
 * The backend (backend/app/spa.py) embeds the five content payloads in a
 * non-executable `<script type="application/json" id="bootstrap-data">`
 * block, so the hero renders as soon as the bundle runs instead of after
 * five API round trips. The Vite dev server and any older HTML have no such
 * block; callers then fall back to fetching.
 */

export const BOOTSTRAP_ELEMENT_ID = 'bootstrap-data';

export const BOOTSTRAP_KEYS = ['aboutMe', 'contact', 'experience', 'projects', 'skills'] as const;

export type BootstrapKey = (typeof BOOTSTRAP_KEYS)[number];

export type BootstrapData = Record<BootstrapKey, Record<string, unknown>>;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * The parsed bootstrap document, or null when it is missing, malformed or
 * lacks any payload. Never throws: a bad block must not take the page down.
 */
export function readBootstrapData(doc: Document = document): BootstrapData | null {
  const text = doc.getElementById(BOOTSTRAP_ELEMENT_ID)?.textContent;
  if (!text) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    if (!isPlainObject(parsed)) return null;
    for (const key of BOOTSTRAP_KEYS) {
      if (!Object.hasOwn(parsed, key) || !isPlainObject(parsed[key])) return null;
    }
    return parsed as BootstrapData;
  } catch {
    return null;
  }
}
