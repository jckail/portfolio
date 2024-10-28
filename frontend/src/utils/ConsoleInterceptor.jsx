import { logToFile } from './LogQueue';

export const initializeConsoleInterceptors = (sessionUUID) => {
    // Override console methods
    ['log', 'warn', 'error', 'info', 'debug'].forEach(level => {
        const original = console[level];
        console[level] = (...args) => {
            logToFile(level, args, sessionUUID);
            original.apply(console, args); // Keep browser output intact
        };
    });
};
