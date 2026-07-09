/**
 * Build a density-descriptor srcSet (1x/2x/3x) for a fixed-display-size
 * image whose 1x/2x variants live alongside the original, suffixed
 * `-1x`/`-2x` before the extension (e.g. `/a/b.webp` -> `/a/b-1x.webp`).
 * The original path itself is used as the 3x (highest-resolution) source.
 */
export function buildHeadshotSrcSet(originalPath: string): string {
  const dot = originalPath.lastIndexOf('.');
  if (dot === -1) return originalPath;

  const base = originalPath.slice(0, dot);
  const ext = originalPath.slice(dot);

  return [
    `${base}-1x${ext} 1x`,
    `${base}-2x${ext} 2x`,
    `${originalPath} 3x`,
  ].join(', ');
}
