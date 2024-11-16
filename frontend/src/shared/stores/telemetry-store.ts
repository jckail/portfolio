import { create } from 'zustand';
import type { TelemetryState, TelemetryLog } from '../../types/telemetry';

export const useTelemetryStore = create<TelemetryState & {
  addLog: (log: TelemetryLog) => void;
  clearLogs: () => void;
}>((set) => ({
  logs: [],
  isEnabled: true,
  addLog: (log: TelemetryLog) =>
    set((state) => ({
      logs: [...state.logs, log]
    })),
  clearLogs: () =>
    set(() => ({
      logs: []
    }))
}));
