import { getSessionUUID } from './sessionManager';
import { logToFile, startQueueProcessing } from './LogQueue';
import { detectBrowserInfo } from './BrowserDetection';
import { initializeConsoleInterceptors } from './ConsoleInterceptor';

// Initialize logging system
export const initializeLogging = () => {
    const sessionUUID = getSessionUUID();
    
    // Initialize console interceptors
    initializeConsoleInterceptors(sessionUUID);

    // Start processing queued logs
    startQueueProcessing();

    // Log browser information at startup
    const browserInfo = detectBrowserInfo();
    // console.log('=== Quick Resume Session Start ===');
    // console.log('Session UUID:', sessionUUID);
    // console.log('Browser:', browserInfo.browser);
    // console.log('Device:', browserInfo.device);
    // console.log('User Agent:', browserInfo.userAgent);
    // console.log('Host:', browserInfo.debugInfo.host);
    // console.log('Port:', browserInfo.debugInfo.port);
    // console.log('Platform:', browserInfo.debugInfo.uaComponents.platform);
    // console.log('Features:', browserInfo.debugInfo.features);
    // console.log('================================');
};
