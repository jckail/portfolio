/** Retired visitor tracker compatibility. No observers or page-hide handlers. */
export function startTracker(): () => void {
  return () => {};
}
export function reportDeepLinks(_search?: string, _hash?: string): void {}
export function resetTrackerForTests(): void {}
