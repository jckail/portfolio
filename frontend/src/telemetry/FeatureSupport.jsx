import React, { useState, useEffect } from 'react';

const FeatureSupport = () => {
    const [features, setFeatures] = useState({
        mozGetUserMedia: false,
        mozRTCPeerConnection: false,
        webkitGetUserMedia: false,
        webkitRTCPeerConnection: false,
        serviceWorker: false,
        pushManager: false,
        maxTouchPoints: 0,
        localStorage: false,
        performance: false,
        webgl: false
    });

    useEffect(() => {
        const detectFeatures = () => {
            const detectedFeatures = {
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

            setFeatures(detectedFeatures);
        };

        detectFeatures();
    }, []);

    return (
        <div className="tab-content">
            <div className="debug-section">
                <div>Firefox APIs: {features.mozGetUserMedia ? 'Yes' : 'No'}</div>
                <div>Safari APIs: {features.webkitGetUserMedia ? 'Yes' : 'No'}</div>
                <div>Service Worker: {features.serviceWorker ? 'Yes' : 'No'}</div>
                <div>Push Manager: {features.pushManager ? 'Yes' : 'No'}</div>
                <div>Touch Points: {features.maxTouchPoints}</div>
                <div>Local Storage: {features.localStorage ? 'Yes' : 'No'}</div>
                <div>Performance API: {features.performance ? 'Yes' : 'No'}</div>
                <div>WebGL: {features.webgl ? 'Yes' : 'No'}</div>
            </div>
        </div>
    );
};

export default FeatureSupport;
