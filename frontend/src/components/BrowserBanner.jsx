import React, { useEffect, useState, useRef } from 'react';
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
    const [activeTab, setActiveTab] = useState('basic');
    const [logs, setLogs] = useState([]);
    const [showNoteInput, setShowNoteInput] = useState(false);
    const [noteText, setNoteText] = useState('');
    const logsRef = useRef(null);
    const noteInputRef = useRef(null);

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

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await fetch(`http://${window.location.hostname}:8080/api/logs`);
                if (response.ok) {
                    const data = await response.json();
                    setLogs(data.logs);
                    if (activeTab === 'logs') {
                        scrollToBottom();
                    }
                }
            } catch (error) {
                console.error('Failed to fetch logs:', error);
            }
        };

        fetchLogs();
        const interval = setInterval(fetchLogs, 1000);
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
                originalUa: ua
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
                        </div>
                    </div>
                );
            case 'connection':
                return (
                    <div className="tab-content">
                        <div className="debug-section">
                            <div>Host: {browserInfo.debugInfo?.host}</div>
                            <div>Port: {browserInfo.debugInfo?.port}</div>
                        </div>
                    </div>
                );
            case 'device':
                return (
                    <div className="tab-content">
                        <div className="debug-section">
                            <div>Platform: {browserInfo.debugInfo?.uaComponents?.platform}</div>
                            <div>Vendor: {browserInfo.debugInfo?.uaComponents?.vendor}</div>
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
