/** Shared viewport band and milestone selection for the rail and shareable URL. */
export function timelineReadingBand() {
  const top = Math.min(140, window.innerHeight * 0.25);
  return { top, bottom: Math.max(top + 1, window.innerHeight * 0.45) };
}

export function readingMilestone(items: Iterable<HTMLElement>): string {
  const { top, bottom } = timelineReadingBand();
  let winner = '';
  let greatestOverlap = -1;
  let nearestDistance = Infinity;
  for (const item of items) {
    const rect = item.getBoundingClientRect();
    const overlap = Math.max(0, Math.min(rect.bottom, bottom) - Math.max(rect.top, top));
    const distance = Math.max(0, rect.top - bottom, top - rect.bottom);
    if (overlap > greatestOverlap || (overlap === greatestOverlap && distance < nearestDistance)) {
      greatestOverlap = overlap;
      nearestDistance = distance;
      winner = item.id;
    }
  }
  return winner;
}
