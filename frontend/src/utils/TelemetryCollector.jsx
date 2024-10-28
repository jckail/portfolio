import { getSessionUUID } from './sessionManager';
import { API_CONFIG } from '../configs';

class TelemetryCollector {
    static instance = null;
    static updateInterval = 60000; // Update every minute
    static intervalId = null;

    constructor() {
        if (TelemetryCollector.instance) {
            return TelemetryCollector.instance;
        }
        TelemetryCollector.instance = this;
        this.setupEventListeners();
        this.startPeriodicUpdates();
    }

    setupEventListeners() {
        // Network changes
        if ('connection' in navigator) {
            navigator.connection.addEventListener('change', () => {
                TelemetryCollector.collectAndSubmit();
            });
        }

        // Screen orientation changes
        if ('screen' in window && 'orientation' in window.screen) {
            window.screen.orientation.addEventListener('change', () => {
                TelemetryCollector.collectAndSubmit();
            });
        }

        // Theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            TelemetryCollector.collectAndSubmit();
        });

        // Visibility changes (tab active/inactive)
        document.addEventListener('visibilitychange', () => {
            TelemetryCollector.collectAndSubmit();
        });

        // Window resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                TelemetryCollector.collectAndSubmit();
            }, 1000);
        });
    }

    startPeriodicUpdates() {
        // Clear any existing interval
        if (TelemetryCollector.intervalId) {
            clearInterval(TelemetryCollector.intervalId);
        }

        // Set up new interval
        TelemetryCollector.intervalId = setInterval(() => {
            TelemetryCollector.collectAndSubmit();
        }, TelemetryCollector.updateInterval);

        // Initial collection
        TelemetryCollector.collectAndSubmit();
    }

    static async collectAndSubmit() {
        const telemetryData = {
            sessionUUID: getSessionUUID(),
            timestamp: new Date().toISOString(),
            browserInfo: {
                browser: '',
                device: '',
                userAgent: navigator.userAgent,
                isMobile: navigator.maxTouchPoints > 0,
                preferences: {
                    language: navigator.language || 'unknown',
                    languages: navigator.languages || [navigator.language || 'unknown'],
                    theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light',
                    doNotTrack: navigator.doNotTrack || 'unspecified',
                    cookiesEnabled: navigator.cookieEnabled
                }
            },
            connectionInfo: {
                networkInfo: {
                    type: (navigator.connection || {}).effectiveType || 'unknown',
                    downlink: (navigator.connection || {}).downlink || 0,
                    rtt: (navigator.connection || {}).rtt || 0
                },
                performanceMetrics: {
                    timeFromLoad: performance.now(),
                    pageLoadTime: (performance.timing?.domContentLoadedEventEnd - performance.timing?.navigationStart) / 1000 || 0,
                    firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0,
                    lcp: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime || 0
                }
            },
            deviceInfo: {
                platform: navigator.platform,
                vendor: navigator.vendor,
                screenWidth: window.screen.width,
                screenHeight: window.screen.height,
                orientation: window.screen.orientation?.type || 'unknown',
                webkitVersion: navigator.userAgent.match(/AppleWebKit\/(\d+\.\d+)/)?.[1] || 'N/A',
                safariVersion: navigator.userAgent.match(/Version\/(\d+\.\d+)/)?.[1] || 'N/A',
                chromeVersion: navigator.userAgent.match(/(?:Chrome|CriOS)\/(\d+\.\d+)/)?.[1] || 'N/A',
                firefoxVersion: navigator.userAgent.match(/(?:Firefox|FxiOS)\/(\d+\.\d+)/)?.[1] || 'N/A'
            },
            featureSupport: {
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
            }
        };

        // Detect browser
        const ua = navigator.userAgent;
        if (ua.includes('Firefox/') || ua.includes('FxiOS')) {
            telemetryData.browserInfo.browser = `firefox ${ua.match(/(?:Firefox|FxiOS)\/(\d+\.\d+)/)?.[1] || ''}`;
        } else if ((ua.includes('Chrome/') && navigator.vendor.includes('Google Inc.')) || ua.includes('CriOS')) {
            telemetryData.browserInfo.browser = `chrome ${ua.match(/(?:Chrome|CriOS)\/(\d+\.\d+)/)?.[1] || ''}`;
        } else if (ua.includes('EdgiOS') || ua.includes('Edg/')) {
            telemetryData.browserInfo.browser = 'edge';
        } else if (navigator.vendor.includes('Apple') && !ua.includes('CriOS')) {
            telemetryData.browserInfo.browser = `safari ${ua.match(/Version\/(\d+\.\d+)/)?.[1] || ''}`;
        }

        // Detect device
        const isIPad = /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isIphone = /iPhone/.test(ua);
        const isMac = /Macintosh|MacIntel/.test(navigator.platform) && !isIPad;
        const osVersion = (() => {
            const iosMatch = ua.match(/(?:iPhone|iPad|iPod).*? OS (\d+_\d+)/);
            if (iosMatch) return iosMatch[1].replace('_', '.');

            const macMatch = ua.match(/Mac OS X (\d+[._]\d+)/);
            if (macMatch) return macMatch[1].replace('_', '.');

            const windowsMatch = ua.match(/Windows NT (\d+\.\d+)/);
            if (windowsMatch) return windowsMatch[1];

            return 'unknown';
        })();

        if (isIPad) {
            telemetryData.browserInfo.device = `iPad (iPadOS ${osVersion})`;
        } else if (isIphone) {
            telemetryData.browserInfo.device = `iPhone (iOS ${osVersion})`;
        } else if (isMac) {
            telemetryData.browserInfo.device = `MacOS ${osVersion}`;
        } else {
            telemetryData.browserInfo.device = 'Desktop';
        }

        try {
            const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.telemetry}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(telemetryData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error submitting telemetry:', error);
            return { status: 'error', message: error.message };
        }
    }

    static initialize() {
        new TelemetryCollector();
    }

    static cleanup() {
        if (TelemetryCollector.intervalId) {
            clearInterval(TelemetryCollector.intervalId);
        }
    }
}

export default TelemetryCollector;
