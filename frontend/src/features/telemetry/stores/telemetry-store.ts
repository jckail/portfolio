import { create } from 'zustand';
import { API_CONFIG } from '../../../config/constants';

interface TelemetryState {
  logs: string[];
  isLoading: boolean;
  error: string | null;
  addLog: (log: string) => void;
  clearLogs: () => void;
  fetchLogs: (token: string) => Promise<void>;
}

export const useTelemetryStore = create<TelemetryState>((set) => ({
  logs: [],
  isLoading: false,
  error: null,
  addLog: (log: string) => set((state) => ({
    logs: [...state.logs, log]
  })),
  clearLogs: () => set({ logs: [] }),
  fetchLogs: async (token: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.admin.logs}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const data = await response.json();
      
      // Ensure logs is an array, default to empty array if not
      const logs = Array.isArray(data.logs) ? data.logs : [];
      set({ logs, isLoading: false, error: null });
    } catch (err) {
      console.error('Error fetching logs:', err);
      // Set error but keep any existing logs
      set(state => ({ 
        error: err instanceof Error ? err.message : 'Failed to fetch logs',
        isLoading: false,
        logs: state.logs // Keep existing logs on error
      }));
    }
  }
}));
