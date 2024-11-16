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

export type TelemetryType = 
  | 'info'
  | 'warning'
  | 'error'
  | 'performance'
  | 'user_action';

export interface PerformanceMetrics {
  pageLoadTime: number;
  firstPaint: number;
  firstContentfulPaint: number;
  timeToInteractive: number;
}

export interface BrowserInfo {
  userAgent: string;
  language: string;
  platform: string;
  screenSize: {
    width: number;
    height: number;
  };
}

export interface ConnectionInfo {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

export interface TelemetryConfig {
  enabled: boolean;
  sampleRate: number;
  logRetentionDays: number;
  excludedEvents?: string[];
}
