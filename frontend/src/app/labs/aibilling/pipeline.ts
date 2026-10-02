/**
 * Illustrative metering pipeline: ingest -> aggregate -> dashboard.
 * The simulated clock only moves when the visitor presses a button, and the numbers
 * below are the demo's own settings, not measurements of the real system.
 */
export const BATCH_INTERVAL_S = 5;
export const REFRESH_INTERVAL_S = 15;

export interface PipelineState {
  clock: number;
  /** Events sent since the demo was reset. */
  sent: number;
  /** Events sent but not yet picked up by the batch aggregator. */
  inQueue: number;
  /** Events aggregated but not yet visible on the dashboard. */
  aggregatedPending: number;
  /** Events visible on the dashboard. */
  onDashboard: number;
  /** Simulated seconds since the dashboard last refreshed. */
  freshnessS: number;
  withinWindow: boolean;
}

export interface PipelineEvent {
  at: number;
}

export function pipelineAt(events: PipelineEvent[], clock: number): PipelineState {
  const lastBatch = Math.floor(clock / BATCH_INTERVAL_S) * BATCH_INTERVAL_S;
  const lastRefresh = Math.floor(clock / REFRESH_INTERVAL_S) * REFRESH_INTERVAL_S;
  let sent = 0;
  let aggregated = 0;
  let onDashboard = 0;
  for (const e of events) {
    if (e.at > clock) continue;
    sent++;
    // An event is aggregated at the first batch boundary after it arrives.
    const batchAt = (Math.floor(e.at / BATCH_INTERVAL_S) + 1) * BATCH_INTERVAL_S;
    if (batchAt <= lastBatch) aggregated++;
    const visibleAt = (Math.floor(batchAt / REFRESH_INTERVAL_S) + 1) * REFRESH_INTERVAL_S;
    if (batchAt <= lastBatch && visibleAt <= lastRefresh) onDashboard++;
  }
  const freshnessS = clock - lastRefresh;
  return {
    clock,
    sent,
    inQueue: sent - aggregated,
    aggregatedPending: aggregated - onDashboard,
    onDashboard,
    freshnessS,
    withinWindow: freshnessS <= REFRESH_INTERVAL_S,
  };
}
