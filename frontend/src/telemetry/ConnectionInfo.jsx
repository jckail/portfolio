import React, { useState, useEffect, useRef } from 'react';

const ConnectionInfo = () => {
    const [connectionInfo, setConnectionInfo] = useState({
        networkInfo: {
            type: 'unknown',
            downlink: 0,
            rtt: 0
        },
        performanceMetrics: {
            timeFromLoad: 0,
            pageLoadTime: 0,
            firstPaint: 0,
            lcp: 0
        }
    });

    const performanceInterval = useRef(null);

    useEffect(() => {
        const updateConnectionInfo = () => {
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            
            const networkInfo = {
                type: connection?.effectiveType || 'unknown',
                downlink: connection?.downlink || 0,
                rtt: connection?.rtt || 0
            };

            const performanceMetrics = {
                timeFromLoad: performance.now(),
                pageLoadTime: (performance.timing?.domContentLoadedEventEnd - performance.timing?.navigationStart) / 1000 || 0,
                firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0,
                lcp: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime || 0
            };

            setConnectionInfo({
                networkInfo,
                performanceMetrics
            });
        };

        // Initial update
        updateConnectionInfo();

        // Set up interval for continuous updates
        performanceInterval.current = setInterval(() => {
            updateConnectionInfo();
        }, 1000);

        return () => {
            if (performanceInterval.current) {
                clearInterval(performanceInterval.current);
            }
        };
    }, []);

    return (
        <div className="tab-content">
            <div className="debug-section">
                <div>Host: {window.location.hostname}</div>
                <div>Port: {window.location.port}</div>
                <div>Network Type: {connectionInfo.networkInfo.type}</div>
                <div>Downlink Speed: {connectionInfo.networkInfo.downlink} Mbps</div>
                <div>Latency (RTT): {connectionInfo.networkInfo.rtt} ms</div>
                <div>Time Since Load: {(connectionInfo.performanceMetrics.timeFromLoad / 1000).toFixed(2)}s</div>
                <div>Page Load Time: {connectionInfo.performanceMetrics.pageLoadTime.toFixed(2)}s</div>
                <div>First Paint: {(connectionInfo.performanceMetrics.firstPaint / 1000).toFixed(2)}s</div>
                <div>Largest Contentful Paint: {(connectionInfo.performanceMetrics.lcp / 1000).toFixed(2)}s</div>
            </div>
        </div>
    );
};

export default ConnectionInfo;
