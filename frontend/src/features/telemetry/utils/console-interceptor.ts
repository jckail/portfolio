import { LogQueue } from './log-queue';

interface ConsoleMessage {
  type: string;
  message: string;
  timestamp: number;
}

type ConsoleMethod = 'log' | 'info' | 'warn' | 'error';
type ConsoleFunction = (message?: unknown, ...args: unknown[]) => void;

export class ConsoleInterceptor {
  private logQueue: LogQueue;
  private originalConsole: Record<ConsoleMethod, ConsoleFunction>;

  constructor(logQueue: LogQueue) {
    this.logQueue = logQueue;
    this.originalConsole = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console)
    };
  }

  intercept(): void {
    (['log', 'info', 'warn', 'error'] as ConsoleMethod[]).forEach(method => {
      (console[method] as ConsoleFunction) = (...args: unknown[]) => {
        const message: ConsoleMessage = {
          type: method,
          message: args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
          ).join(' '),
          timestamp: Date.now()
        };

        this.logQueue.enqueue(message);
        this.originalConsole[method].apply(console, args);
      };
    });
  }

  restore(): void {
    Object.entries(this.originalConsole).forEach(([method, func]) => {
      (console[method as ConsoleMethod] as ConsoleFunction) = func;
    });
  }
}
