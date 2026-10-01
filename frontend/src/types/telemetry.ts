export interface TelemetryState {
  logs: TelemetryLog[];
  isEnabled: boolean;
}

export interface TelemetryLog {
  id: string;
  timestamp: string;
  type: TelemetryType;
  message: string;
  metadata?: Record<string, unknown>;
}

export type TelemetryType = 'info' | 'warning' | 'error' | 'performance' | 'user_action';
