import React, { useState, useEffect } from 'react';

const DeviceDetails = () => {
    const [deviceInfo, setDeviceInfo] = useState({
        platform: '',
        vendor: '',
        screenWidth: 0,
        screenHeight: 0,
        orientation: '',
        webkitVersion: '',
        safariVersion: '',
        chromeVersion: '',
        firefoxVersion: '',
        osVersion: ''
    });

    useEffect(() => {
        const detectDeviceInfo = () => {
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

            const info = {
                platform,
                vendor,
                screenWidth: window.screen.width,
                screenHeight: window.screen.height,
                orientation: window.screen.orientation?.type || 'unknown',
                webkitVersion: ua.match(/AppleWebKit\/(\d+\.\d+)/)?.[1] || 'N/A',
                safariVersion: ua.match(/Version\/(\d+\.\d+)/)?.[1] || 'N/A',
                chromeVersion: ua.match(/(?:Chrome|CriOS)\/(\d+\.\d+)/)?.[1] || 'N/A',
                firefoxVersion: ua.match(/(?:Firefox|FxiOS)\/(\d+\.\d+)/)?.[1] || 'N/A',
                osVersion: getOSVersion()
            };

            setDeviceInfo(info);
        };

        detectDeviceInfo();

        // Listen for orientation changes
        const handleOrientationChange = () => {
            setDeviceInfo(prev => ({
                ...prev,
                orientation: window.screen.orientation?.type || 'unknown'
            }));
        };

        window.addEventListener('orientationchange', handleOrientationChange);

        return () => {
            window.removeEventListener('orientationchange', handleOrientationChange);
        };
    }, []);

    return (
        <div className="tab-content">
            <div className="debug-section">
                <div>Platform: {deviceInfo.platform}</div>
                <div>Vendor: {deviceInfo.vendor}</div>
                <div>Screen Resolution: {deviceInfo.screenWidth}x{deviceInfo.screenHeight}</div>
                <div>Orientation: {deviceInfo.orientation}</div>
                <div>WebKit Version: {deviceInfo.webkitVersion}</div>
                <div>Safari Version: {deviceInfo.safariVersion}</div>
                <div>Chrome Version: {deviceInfo.chromeVersion}</div>
                <div>Firefox Version: {deviceInfo.firefoxVersion}</div>
                <div>OS Version: {deviceInfo.osVersion}</div>
            </div>
        </div>
    );
};

export default DeviceDetails;
