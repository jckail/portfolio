import { LogQueue } from './log-queue';
import { ConsoleInterceptor } from './console-interceptor';
import { detectBrowser } from '../browser/browser-detection';

interface SystemInfo {
  userAgent: string;
  language: string;
  platform: string;
  screenResolution: {
    width: number;
    height: number;
  };
  viewport: {
    width: number;
    height: number;
  };
}

export class TelemetryCollector {
  private logQueue: LogQueue;
  private consoleInterceptor: ConsoleInterceptor;
  private static instance: TelemetryCollector;

  private constructor() {
    this.logQueue = new LogQueue();
    this.consoleInterceptor = new ConsoleInterceptor(this.logQueue);
  }

  static getInstance(): TelemetryCollector {
    if (!TelemetryCollector.instance) {
      TelemetryCollector.instance = new TelemetryCollector();
    }
    return TelemetryCollector.instance;
  }

  start(): void {
    this.consoleInterceptor.intercept();
  }

  stop(): void {
    this.consoleInterceptor.restore();
  }

  getLogs(): ReturnType<LogQueue['getAll']> {
    return this.logQueue.getAll();
  }

  getBrowserInfo() {
    return detectBrowser();
  }

  getSystemInfo(): SystemInfo {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: {
        width: window.screen.width,
        height: window.screen.height
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
  }

  clearLogs(): void {
    this.logQueue.clear();
  }
}
