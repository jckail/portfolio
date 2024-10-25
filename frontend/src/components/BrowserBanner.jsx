import React, { useEffect, useState, useRef } from 'react';
import '../styles/browser-banner.css';

const BrowserBanner = () => {
    const [browserInfo, setBrowserInfo] = useState({
        browser: '',
        userAgent: '',
        isMobile: false,
        device: '',
        preferences: {
            language: '',
            languages: [],
            theme: '',
            doNotTrack: '',
            cookiesEnabled: false
        },
        debugInfo: {
            uaComponents: {
                rawTokens: []
            }
        },
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
    const [isVisible, setIsVisible] = useState(true);
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [activeTab, setActiveTab] = useState('basic');
    const [logs, setLogs] = useState([]);
    const [showNoteInput, setShowNoteInput] = useState(false);
    const [noteText, setNoteText] = useState('');
    const logsRef = useRef(null);
    const noteInputRef = useRef(null);
    const performanceInterval = useRef(null);

    // Check if we're running on Vite's development server (port 5173)
    const isViteDev = window.location.port === '5173';

    // If not running on Vite dev server, don't render anything
    if (!isViteDev) return null;

    // Scroll logs to bottom
    const scrollToBottom = () => {
        if (logsRef.current) {
            logsRef.current.scrollTop = logsRef.current.scrollHeight;
        }
    };

    const fetchLogs = async (isManualRefresh = false) => {
        try {
            const response = await fetch(`http://${window.location.hostname}:8080/api/logs`);
            if (response.ok) {
                const data = await response.json();
                setLogs(data.logs);
                // Scroll to bottom for manual refreshes or when logs tab is active
                if (isManualRefresh || activeTab === 'logs') {
                    setTimeout(scrollToBottom, 0);
                }
            }
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        }
    };

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(() => fetchLogs(), 20000);
        return () => clearInterval(interval);
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'logs') {
            scrollToBottom();
        }
    }, [activeTab]);

    // Focus note input when shown
    useEffect(() => {
        if (showNoteInput && noteInputRef.current) {
            noteInputRef.current.focus();
        }
    }, [showNoteInput]);

    const handleAddNote = async () => {
        if (!noteText.trim()) return;

        try {
            const response = await fetch(`http://${window.location.hostname}:8080/api/log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: `[NOTE] ${noteText}`,
                }),
            });

            if (response.ok) {
                setNoteText('');
                setShowNoteInput(false);
                // Refresh logs immediately after adding a note with manual refresh flag
                await fetchLogs(true);
            }
        } catch (error) {
            console.error('Failed to add note:', error);
        }
    };

    const handleNoteKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAddNote();
        }
    };

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
            
            const uaParts = {
                webkitVersion: ua.match(/AppleWebKit\/(\d+\.\d+)/)?.[1],
                safariVersion: ua.match(/Version\/(\d+\.\d+)/)?.[1],
                chromeVersion: ua.match(/(?:Chrome|CriOS)\/(\d+\.\d+)/)?.[1],
                firefoxVersion: ua.match(/(?:Firefox|FxiOS)\/(\d+\.\d+)/)?.[1],
                osVersion: getOSVersion(),
                isIpad: isIPad(),
                isIphone: /iPhone/.test(ua),
                isMac: /Macintosh|MacIntel/.test(platform) && !isIPad(),
                originalUa: ua,
                screenWidth: window.screen.width,
                screenHeight: window.screen.height,
                orientation: window.screen.orientation?.type || 'unknown'
            };

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

            const isFirefox = () => {
                return ua.includes('Firefox/') || 
                       ua.includes('FxiOS') || 
                       features.mozGetUserMedia || 
                       features.mozRTCPeerConnection;
            };

            const isChrome = () => {
                if (ua.includes('CriOS')) return true;
                return ua.includes('Chrome/') && 
                       vendor.includes('Google Inc.') &&
                       !ua.includes('Edg/') && 
                       !ua.includes('OPR/');
            };

            if (uaParts.isIpad) {
                device = `iPad (iPadOS ${uaParts.osVersion})`;
            } else if (uaParts.isIphone) {
                device = `iPhone (iOS ${uaParts.osVersion})`;
            } else if (uaParts.isMac) {
                device = `MacOS ${uaParts.osVersion}`;
            } else {
                device = 'Desktop';
            }

            if (isFirefox()) {
                browser = `firefox ${uaParts.firefoxVersion || ''}`;
            } else if (isChrome()) {
                browser = `chrome ${uaParts.chromeVersion || ''}`;
            } else if (ua.includes('EdgiOS') || ua.includes('Edg/')) {
                browser = 'edge';
            } else if (vendor.includes('Apple') && !isChrome()) {
                browser = `safari ${uaParts.safariVersion || ''}`;
            }

            // Get browser preferences
            const preferences = {
                language: navigator.language || 'unknown',
                languages: navigator.languages || [navigator.language || 'unknown'],
                theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light',
                doNotTrack: navigator.doNotTrack || 'unspecified',
                cookiesEnabled: navigator.cookieEnabled
            };

            // Get network information
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            const networkInfo = {
                type: connection?.effectiveType || 'unknown',
                downlink: connection?.downlink || 0,
                rtt: connection?.rtt || 0
            };

            // Get performance metrics
            const performanceMetrics = {
                timeFromLoad: performance.now(),
                pageLoadTime: (performance.timing?.domContentLoadedEventEnd - performance.timing?.navigationStart) / 1000 || 0,
                firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0,
                lcp: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime || 0
            };

            return {
                browser,
                device,
                userAgent: ua,
                isMobile: features.maxTouchPoints > 0,
                preferences,
                debugInfo: {
                    uaComponents: {
                        ...uaParts,
                        vendor,
                        platform
                    },
                    features,
                    host: window.location.hostname,
                    port: window.location.port
                },
                networkInfo,
                performanceMetrics
            };
        };

        setBrowserInfo(detectBrowser());

        // Update performance metrics periodically
        performanceInterval.current = setInterval(() => {
            setBrowserInfo(prev => ({
                ...prev,
                performanceMetrics: {
                    ...prev.performanceMetrics,
                    timeFromLoad: performance.now()
                }
            }));
        }, 1000);

        return () => {
            if (performanceInterval.current) {
                clearInterval(performanceInterval.current);
            }
        };
    }, []);

    const handleClose = () => {
        setIsVisible(false);
    };

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    const handleTabClick = (tabName) => {
        if (isCollapsed) {
            setIsCollapsed(false);
            setActiveTab(tabName);
        } else if (activeTab === tabName) {
            setIsCollapsed(true);
        } else {
            setActiveTab(tabName);
        }
    };

    if (!isVisible) return null;

    const bannerClass = `browser-banner ${browserInfo.browser.split(' ')[0]} ${isCollapsed ? 'collapsed' : ''}`;
    
    const getBrowserInfo = () => {
        const browserName = browserInfo.browser.split(' ')[0];
        const browserVersion = browserInfo.browser.split(' ')[1] || '';
        const formattedBrowser = browserName.charAt(0).toUpperCase() + browserName.slice(1);
        const deviceInfo = browserInfo.device ? ` on ${browserInfo.device}` : '';
        return `${formattedBrowser} ${browserVersion}${deviceInfo}`;
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'basic':
                return (
                    <div className="tab-content">
                        <div className="user-agent">User Agent: {browserInfo.userAgent}</div>
                        <div className="debug-section">
                            <div>Browser: {getBrowserInfo()}</div>
                            <div>Mobile Device: {browserInfo.isMobile ? 'Yes' : 'No'}</div>
                            <div>Browser Language: {browserInfo.preferences.language}</div>
                            <div>Preferred Languages: {browserInfo.preferences.languages.join(', ')}</div>
                            <div>Browser Theme: {browserInfo.preferences.theme} Mode</div>
                            <div>Do Not Track: {browserInfo.preferences.doNotTrack}</div>
                            <div>Cookies Enabled: {browserInfo.preferences.cookiesEnabled ? 'Yes' : 'No'}</div>
                        </div>
                    </div>
                );
            case 'connection':
                return (
                    <div className="tab-content">
                        <div className="debug-section">
                            <div>Host: {browserInfo.debugInfo?.host}</div>
                            <div>Port: {browserInfo.debugInfo?.port}</div>
                            <div>Network Type: {browserInfo.networkInfo.type}</div>
                            <div>Downlink Speed: {browserInfo.networkInfo.downlink} Mbps</div>
                            <div>Latency (RTT): {browserInfo.networkInfo.rtt} ms</div>
                            <div>Time Since Load: {(browserInfo.performanceMetrics.timeFromLoad / 1000).toFixed(2)}s</div>
                            <div>Page Load Time: {browserInfo.performanceMetrics.pageLoadTime.toFixed(2)}s</div>
                            <div>First Paint: {(browserInfo.performanceMetrics.firstPaint / 1000).toFixed(2)}s</div>
                            <div>Largest Contentful Paint: {(browserInfo.performanceMetrics.lcp / 1000).toFixed(2)}s</div>
                        </div>
                    </div>
                );
            case 'device':
                return (
                    <div className="tab-content">
                        <div className="debug-section">
                            <div>Platform: {browserInfo.debugInfo?.uaComponents?.platform}</div>
                            <div>Vendor: {browserInfo.debugInfo?.uaComponents?.vendor}</div>
                            <div>Screen Resolution: {browserInfo.debugInfo?.uaComponents?.screenWidth}x{browserInfo.debugInfo?.uaComponents?.screenHeight}</div>
                            <div>Orientation: {browserInfo.debugInfo?.uaComponents?.orientation}</div>
                            <div>WebKit Version: {browserInfo.debugInfo?.uaComponents?.webkitVersion}</div>
                            <div>Safari Version: {browserInfo.debugInfo?.uaComponents?.safariVersion}</div>
                            <div>Chrome Version: {browserInfo.debugInfo?.uaComponents?.chromeVersion}</div>
                            <div>Firefox Version: {browserInfo.debugInfo?.uaComponents?.firefoxVersion}</div>
                            <div>OS Version: {browserInfo.debugInfo?.uaComponents?.osVersion}</div>
                        </div>
                    </div>
                );
            case 'features':
                return (
                    <div className="tab-content">
                        <div className="debug-section">
                            <div>Firefox APIs: {browserInfo.debugInfo?.features?.mozGetUserMedia ? 'Yes' : 'No'}</div>
                            <div>Safari APIs: {browserInfo.debugInfo?.features?.webkitGetUserMedia ? 'Yes' : 'No'}</div>
                            <div>Service Worker: {browserInfo.debugInfo?.features?.serviceWorker ? 'Yes' : 'No'}</div>
                            <div>Push Manager: {browserInfo.debugInfo?.features?.pushManager ? 'Yes' : 'No'}</div>
                            <div>Touch Points: {browserInfo.debugInfo?.features?.maxTouchPoints}</div>
                            <div>Local Storage: {browserInfo.debugInfo?.features?.localStorage ? 'Yes' : 'No'}</div>
                            <div>Performance API: {browserInfo.debugInfo?.features?.performance ? 'Yes' : 'No'}</div>
                            <div>WebGL: {browserInfo.debugInfo?.features?.webgl ? 'Yes' : 'No'}</div>
                        </div>
                    </div>
                );
            case 'logs':
                return (
                    <div className="tab-content">
                        <div className="logs-header">
                            <button 
                                className="add-note-button"
                                onClick={() => setShowNoteInput(!showNoteInput)}
                            >
                                {showNoteInput ? 'Cancel Note' : 'Add Note'}
                            </button>
                            <button 
                                className="refresh-logs-button"
                                onClick={() => fetchLogs(true)}
                            >
                                Refresh Logs
                            </button>
                        </div>
                        {showNoteInput && (
                            <div className="note-input-container">
                                <textarea
                                    ref={noteInputRef}
                                    className="note-input"
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    onKeyPress={handleNoteKeyPress}
                                    placeholder="Type your note here... (Press Enter to save)"
                                    rows={3}
                                />
                                <button 
                                    className="save-note-button"
                                    onClick={handleAddNote}
                                >
                                    Save Note
                                </button>
                            </div>
                        )}
                        <div className="logs-section" ref={logsRef}>
                            {logs.map((log, index) => (
                                <div key={index} className="log-entry">
                                    <span className="log-timestamp">{log.timestamp}</span>
                                    <span className="log-message">{log.message}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className={bannerClass}>
            <button className="close-button" onClick={handleClose} aria-label="Close banner">
                ×
            </button>
            <div className="banner-main">
                <div className="browser-info">{getBrowserInfo()}</div>
                <div className="tabs">
                    <button 
                        className={`tab-button ${activeTab === 'basic' ? 'active' : ''}`}
                        onClick={() => handleTabClick('basic')}
                    >
                        Basic Info
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'connection' ? 'active' : ''}`}
                        onClick={() => handleTabClick('connection')}
                    >
                        Connection
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'device' ? 'active' : ''}`}
                        onClick={() => handleTabClick('device')}
                    >
                        Device Details
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'features' ? 'active' : ''}`}
                        onClick={() => handleTabClick('features')}
                    >
                        Features
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'logs' ? 'active' : ''}`}
                        onClick={() => handleTabClick('logs')}
                    >
                        Logs
                    </button>
                </div>
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
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};

export default BrowserBanner;
