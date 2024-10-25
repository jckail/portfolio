import React, { useState, useEffect } from 'react';

const BrowserInfo = ({ onBrowserDetect }) => {
    const [browserInfo, setBrowserInfo] = useState({
        browser: '',
        device: '',
        userAgent: '',
        isMobile: false,
        preferences: {
            language: '',
            languages: [],
            theme: '',
            doNotTrack: '',
            cookiesEnabled: false
        }
    });

    useEffect(() => {
        const detectBrowser = () => {
            const ua = navigator.userAgent;
            const vendor = navigator.vendor;
            const platform = navigator.platform;

            const getOSVersion = () => {
                const iosMatch = ua.match(/(?:iPhone|iPad|iPod).*? OS (\d+_\d+)/);
                if (iosMatch) return iosMatch[1].replace('_', '.');

                const macMatch = ua.match(/Mac OS X (\d+[._]\d+)/);
                if (macMatch) return macMatch[1].replace('_', '.');

                const windowsMatch = ua.match(/Windows NT (\d+\.\d+)/);
                if (windowsMatch) return windowsMatch[1];

                return 'unknown';
            };

            const isIPad = () => {
                if (/iPad/.test(ua)) return true;
                if (platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
                    const isStandalone = window.navigator.standalone !== undefined;
                    const hasTouchScreen = navigator.maxTouchPoints > 1;
                    return isStandalone && hasTouchScreen;
                }
                return false;
            };

            let browser = 'other';
            let device = 'unknown';
            const isIpad = isIPad();
            const isIphone = /iPhone/.test(ua);
            const isMac = /Macintosh|MacIntel/.test(platform) && !isIpad;
            const osVersion = getOSVersion();

            if (isIpad) {
                device = `iPad (iPadOS ${osVersion})`;
            } else if (isIphone) {
                device = `iPhone (iOS ${osVersion})`;
            } else if (isMac) {
                device = `MacOS ${osVersion}`;
            } else {
                device = 'Desktop';
            }

            const isFirefox = () => {
                return ua.includes('Firefox/') || 
                       ua.includes('FxiOS') || 
                       'mozGetUserMedia' in navigator || 
                       'mozRTCPeerConnection' in window;
            };

            const isChrome = () => {
                if (ua.includes('CriOS')) return true;
                return ua.includes('Chrome/') && 
                       vendor.includes('Google Inc.') &&
                       !ua.includes('Edg/') && 
                       !ua.includes('OPR/');
            };

            const getBrowserVersion = () => {
                const versionMatches = {
                    firefox: ua.match(/(?:Firefox|FxiOS)\/(\d+\.\d+)/)?.[1],
                    chrome: ua.match(/(?:Chrome|CriOS)\/(\d+\.\d+)/)?.[1],
                    safari: ua.match(/Version\/(\d+\.\d+)/)?.[1]
                };

                if (isFirefox()) return versionMatches.firefox || '';
                if (isChrome()) return versionMatches.chrome || '';
                if (vendor.includes('Apple')) return versionMatches.safari || '';
                return '';
            };

            if (isFirefox()) {
                browser = `firefox ${getBrowserVersion()}`;
            } else if (isChrome()) {
                browser = `chrome ${getBrowserVersion()}`;
            } else if (ua.includes('EdgiOS') || ua.includes('Edg/')) {
                browser = 'edge';
            } else if (vendor.includes('Apple') && !isChrome()) {
                browser = `safari ${getBrowserVersion()}`;
            }

            const info = {
                browser,
                device,
                userAgent: ua,
                isMobile: navigator.maxTouchPoints > 0,
                preferences: {
                    language: navigator.language || 'unknown',
                    languages: navigator.languages || [navigator.language || 'unknown'],
                    theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light',
                    doNotTrack: navigator.doNotTrack || 'unspecified',
                    cookiesEnabled: navigator.cookieEnabled
                }
            };

            setBrowserInfo(info);
            if (onBrowserDetect) {
                onBrowserDetect(browser.split(' ')[0]);
            }
        };

        detectBrowser();
    }, [onBrowserDetect]);

    const browserName = browserInfo.browser.split(' ')[0];
    const browserVersion = browserInfo.browser.split(' ')[1] || '';
    const formattedBrowser = browserName.charAt(0).toUpperCase() + browserName.slice(1);
    const deviceInfo = browserInfo.device ? ` on ${browserInfo.device}` : '';
    const browserInfoString = `${formattedBrowser} ${browserVersion}${deviceInfo}`;

    return (
        <div className="tab-content">
            <div className="browser-info-display">{browserInfoString}</div>
            <div className="user-agent">User Agent: {browserInfo.userAgent}</div>
            <div className="debug-section">
                <div>Browser: {browserInfoString}</div>
                <div>Mobile Device: {browserInfo.isMobile ? 'Yes' : 'No'}</div>
                <div>Browser Language: {browserInfo.preferences.language}</div>
                <div>Preferred Languages: {browserInfo.preferences.languages.join(', ')}</div>
                <div>Browser Theme: {browserInfo.preferences.theme} Mode</div>
                <div>Do Not Track: {browserInfo.preferences.doNotTrack}</div>
                <div>Cookies Enabled: {browserInfo.preferences.cookiesEnabled ? 'Yes' : 'No'}</div>
            </div>
        </div>
    );
};

export default BrowserInfo;
