import React, { useEffect, useState } from 'react';
import '../styles/browser-banner.css';

const BrowserBanner = () => {
    const [browserInfo, setBrowserInfo] = useState({
        browser: '',
        userAgent: '',
        isMobile: false,
        device: '',
        debugInfo: {
            uaComponents: {
                rawTokens: []
            }
        }
    });
    const [isVisible, setIsVisible] = useState(true);
    const [isCollapsed, setIsCollapsed] = useState(true);

    // Check if we're running on Vite's development server (port 5173)
    const isViteDev = window.location.port === '5173' && 
                     (window.location.hostname === 'localhost' || 
                      window.location.hostname.match(/^(?:192\.168\.|172\.(?:1[6-9]|2[0-9]|3[0-1])\.|10\.)/));

    // If not running on Vite dev server, don't render anything
    if (!isViteDev) return null;

    useEffect(() => {
        const detectBrowser = () => {
            const ua = navigator.userAgent;
            const vendor = navigator.vendor;
            const platform = navigator.platform;
            
            // Helper function to extract OS version
            const getOSVersion = () => {
                // Try to match iPadOS/iOS version
                const iosMatch = ua.match(/(?:iPhone|iPad|iPod).*? OS (\d+_\d+)/);
                if (iosMatch) {
                    return iosMatch[1].replace('_', '.');
                }

                // Try to match macOS version
                const macMatch = ua.match(/Mac OS X (\d+[._]\d+)/);
                if (macMatch) {
                    return macMatch[1].replace('_', '.');
                }

                // Try to match Windows version
                const windowsMatch = ua.match(/Windows NT (\d+\.\d+)/);
                if (windowsMatch) {
                    return windowsMatch[1];
                }

                return 'unknown';
            };
            
            // Detailed parsing of user agent components
            const uaParts = {
                webkitVersion: ua.match(/AppleWebKit\/(\d+\.\d+)/)?.[1],
                safariVersion: ua.match(/Version\/(\d+\.\d+)/)?.[1],
                osVersion: getOSVersion(),
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

            // Browser detection
            if (isFirefox()) {
                browser = 'firefox';
            } else if (ua.includes('CriOS')) {
                browser = 'chrome';
            } else if (ua.includes('EdgiOS')) {
                browser = 'edge';
            } else if (vendor.includes('Apple')) {
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

        setBrowserInfo(detectBrowser());
    }, []);

    const handleClose = () => {
        setIsVisible(false);
    };

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    if (!isVisible) return null;

    const bannerClass = `browser-banner ${browserInfo.browser} ${isCollapsed ? 'collapsed' : ''}`;
    
    const getBrowserInfo = () => {
        const deviceInfo = browserInfo.device ? ` on ${browserInfo.device}` : '';
        return `${browserInfo.browser.charAt(0).toUpperCase() + browserInfo.browser.slice(1)}${deviceInfo}`;
    };

    return (
        <div className={bannerClass}>
            <button className="close-button" onClick={handleClose} aria-label="Close banner">
                ×
            </button>
            <div className="banner-main">
                Welcome to Quick Resume! You're using {getBrowserInfo()}
                <button 
                    className="collapse-button" 
                    onClick={toggleCollapse} 
                    aria-label={isCollapsed ? "Expand banner" : "Collapse banner"}
                >
                    {isCollapsed ? '▼' : '▲'}
                </button>
            </div>
            <div className="collapsible-content">
                <div className="debug-info">
                    <div className="user-agent">User Agent: {browserInfo.userAgent}</div>
                    <div className="debug-details">
                        <div>Connection Info:</div>
                        <div>- Host: {browserInfo.debugInfo?.host}</div>
                        <div>- Port: {browserInfo.debugInfo?.port}</div>
                        <div>Device Info:</div>
                        <div>- Platform: {browserInfo.debugInfo?.uaComponents?.platform}</div>
                        <div>- Vendor: {browserInfo.debugInfo?.uaComponents?.vendor}</div>
                        <div>- WebKit: {browserInfo.debugInfo?.uaComponents?.webkitVersion}</div>
                        <div>- Safari Version: {browserInfo.debugInfo?.uaComponents?.safariVersion}</div>
                        <div>- OS Version: {browserInfo.debugInfo?.uaComponents?.osVersion}</div>
                        <div>Features:</div>
                        <div>- Firefox APIs: {browserInfo.debugInfo?.features?.mozGetUserMedia ? 'Yes' : 'No'}</div>
                        <div>- Safari APIs: {browserInfo.debugInfo?.features?.webkitGetUserMedia ? 'Yes' : 'No'}</div>
                        <div>- Service Worker: {browserInfo.debugInfo?.features?.serviceWorker ? 'Yes' : 'No'}</div>
                        <div>- Push Manager: {browserInfo.debugInfo?.features?.pushManager ? 'Yes' : 'No'}</div>
                        <div>- Touch Points: {browserInfo.debugInfo?.features?.maxTouchPoints}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BrowserBanner;
