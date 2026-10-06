import type { AnalyticsEvent } from './events';

/** Compatibility surface for existing feature calls. Visitor analytics is
 * retired: no queue, timers, identifiers, GA calls, beacon, or HTTP transport.
 */
export interface TrackOptions {
  ga?: boolean;
}
export function track(
  _event: AnalyticsEvent,
  _props?: Record<string, unknown>,
  _options: TrackOptions = {}
): void {}
export function flush(): void {}
export function reset(): void {}
export function resetForTests(): void {}
