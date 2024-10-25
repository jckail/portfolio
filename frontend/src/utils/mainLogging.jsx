import { getSessionUUID } from './sessionManager';

// Queue to store logs while backend is not available
let logQueue = [];
let isProcessingQueue = false;

// Process queued logs
const processLogQueue = async () => {
    if (isProcessingQueue || logQueue.length === 0) return;
    
    isProcessingQueue = true;
    while (logQueue.length > 0) {
        const { level, args, sessionUUID } = logQueue[0];
        try {
            const message = `[${level}] [${sessionUUID}] ${args.join(' ')}`;
            const response = await fetch('/api/log', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message, sessionUUID }),
            });
            
            if (response.ok) {
                logQueue.shift(); // Remove processed log
            } else {
                break; // Stop processing if we encounter an error
            }
        } catch (error) {
            break; // Stop processing if we encounter an error
        }
    }
    isProcessingQueue = false;
};

// Custom logging function that sends logs to backend
const logToFile = async (level, args) => {
    const sessionUUID = getSessionUUID();
    // Add to queue
    logQueue.push({ level, args, sessionUUID });
    
    // Try to process queue
    processLogQueue();
    
    // If queue gets too large, remove oldest items
    if (logQueue.length > 1000) {
        logQueue = logQueue.slice(-1000);
    }
};

// Function to detect browser and system information
const detectBrowserInfo = () => {
    const ua = navigator.userAgent;
    const vendor = navigator.vendor;
    const platform = navigator.platform;
    
    // Detailed parsing of user agent components
    const uaParts = {
        webkitVersion: ua.match(/AppleWebKit\/(\d+\.\d+)/)?.[1],
        safariVersion: ua.match(/Version\/(\d+\.\d+)/)?.[1],
        chromeVersion: ua.match(/Chrome\/(\d+\.\d+)/)?.[1],
        osVersion: ua.match(/(?:iPhone|iPad|Mac|Windows).+?(?:OS|Mac OS|Windows NT) +(\d+[._]\d+)/)?.[1]?.replace('_', '.'),
        isIpad: /iPad/.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1),
        isIphone: /iPhone/.test(ua),
        isMac: /Macintosh|MacIntel/.test(platform),
        originalUa: ua
    };

    // Feature detection
    const features = {
        mozGetUserMedia: 'mozGetUserMedia' in navigator,
        mozRTCPeerConnection: 'mozRTCPeerConnection' in window,
        webkitGetUserMedia: 'webkitGetUserMedia' in navigator,
        webkitRTCPeerConnection: 'webkitRTCPeerConnection' in window,
        serviceWorker: 'serviceWorker' in navigator,
        pushManager: 'PushManager' in window,
        maxTouchPoints: navigator.maxTouchPoints || 0,
        localStorage: (() => {
            try {
                localStorage.setItem('test', 'test');
                localStorage.removeItem('test');
                return true;
            } catch (e) {
                return false;
            }
        })(),
        performance: 'performance' in window,
        webgl: (() => {
            try {
                return !!document.createElement('canvas').getContext('webgl');
            } catch (e) {
                return false;
            }
        })()
    };

    let browser = 'other';
    let device = 'unknown';

    // Enhanced browser detection logic
    const isFirefox = () => {
        if (features.mozGetUserMedia || features.mozRTCPeerConnection) {
            return true;
        }
        if (ua.includes('FxiOS')) {
            return true;
        }
        if (uaParts.isIpad) {
            return !ua.includes('CriOS') && 
                   !ua.includes('EdgiOS') && 
                   ua.includes('Safari') &&
                   features.serviceWorker &&
                   features.pushManager &&
                   !features.webkitGetUserMedia;
        }
        return false;
    };

    // Device detection
    if (uaParts.isIpad) {
        device = `iPad (iPadOS ${uaParts.osVersion})`;
    } else if (uaParts.isIphone) {
        device = `iPhone (iOS ${uaParts.osVersion})`;
    } else if (uaParts.isMac) {
        device = `MacOS ${uaParts.osVersion}`;
    } else {
        device = 'Desktop';
    }

    // Improved browser detection
    if (isFirefox()) {
        browser = 'firefox';
    } else if (ua.includes('CriOS') || (ua.includes('Chrome') && vendor === 'Google Inc.')) {
        browser = 'chrome';
    } else if (ua.includes('EdgiOS') || ua.includes('Edge')) {
        browser = 'edge';
    } else if (vendor.includes('Apple') || ua.includes('Safari')) {
        browser = 'safari';
    }

    return {
        browser,
        device,
        userAgent: ua,
        isMobile: features.maxTouchPoints > 0,
        debugInfo: {
            uaComponents: {
                ...uaParts,
                vendor,
                platform
            },
            features,
            host: window.location.hostname,
            port: window.location.port
        }
    };
};

// Initialize logging system
export const initializeLogging = () => {
    const sessionUUID = getSessionUUID();
    
    // Override console methods
    ['log', 'warn', 'error', 'info', 'debug'].forEach(level => {
        const original = console[level];
        console[level] = (...args) => {
            logToFile(level, args);
            original.apply(console, args); // Keep browser output intact
        };
    });

    // Periodically try to process queued logs
    setInterval(processLogQueue, 5000);

    // Log browser information at startup
    const browserInfo = detectBrowserInfo();
    console.log('=== Quick Resume Session Start ===');
    console.log('Session UUID:', sessionUUID);
    console.log('Browser:', browserInfo.browser);
    console.log('Device:', browserInfo.device);
    console.log('User Agent:', browserInfo.userAgent);
    console.log('Host:', browserInfo.debugInfo.host);
    console.log('Port:', browserInfo.debugInfo.port);
    console.log('Platform:', browserInfo.debugInfo.uaComponents.platform);
    console.log('Features:', browserInfo.debugInfo.features);
    console.log('================================');
};
