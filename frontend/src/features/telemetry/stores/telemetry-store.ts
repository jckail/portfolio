import { create } from 'zustand';

interface TelemetryState {
  logs: string[];
  addLog: (log: string) => void;
  clearLogs: () => void;
}

export const useTelemetryStore = create<TelemetryState>((set) => ({
  logs: [],
  addLog: (log: string) => set((state) => ({
    logs: [...state.logs, log]
  })),
  clearLogs: () => set({ logs: [] })
}));
