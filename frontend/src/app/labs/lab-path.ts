/**
 * Which URL paths belong to the lab host. A hosted lab lives at `/<slug>`
 * (backend/app/models/labs.py owns the slug rules); anything else, including
 * the paths other features own, keeps its existing route.
 */
const LAB_PATH = /^\/([a-z][a-z0-9]{2,30})\/?$/;

/** Slugs the backend reserves, plus routes this SPA already renders itself. */
const NOT_LABS = new Set([
  'api', 'admin', 'assets', 'fonts', 'images', 'ws', 'docs', 'static', 'dataplayground',
  'health', 'robots', 'sitemap', 'llms', 'resume', 'favicon',
]);

export function labSlugFromPath(pathname: string): string | null {
  const match = LAB_PATH.exec(pathname);
  if (!match || NOT_LABS.has(match[1])) return null;
  return match[1];
}
