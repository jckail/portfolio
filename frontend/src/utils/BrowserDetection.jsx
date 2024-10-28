// Function to detect browser and system information
export const detectBrowserInfo = () => {
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
