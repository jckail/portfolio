import React, { useState, useEffect, useRef } from 'react';
import BrowserInfo from './BrowserInfo';
import ConnectionInfo from './ConnectionInfo';
import DeviceDetails from './DeviceDetails';
import FeatureSupport from './FeatureSupport';
import LogViewer from './LogViewer';
import { getSessionUUID } from '../utils/sessionManager';
import './telemetry-banner.css';

const TelemetryBanner = ({ isAdminLoggedIn }) => {
    const [isVisible, setIsVisible] = useState(true);
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [activeTab, setActiveTab] = useState('basic');
    const [browserType, setBrowserType] = useState('other');
    const performanceInterval = useRef(null);
    const currentSessionUUID = getSessionUUID();

    // Check if we're running on localhost:5173
    const isLocalDev = window.location.hostname === 'localhost' && window.location.port === '5173';

    // Only show if we're in local dev mode or admin is logged in
    const shouldShow = isLocalDev || isAdminLoggedIn;

    // If not allowed to show, don't render anything
    if (!shouldShow) return null;

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

    const handleBrowserDetect = (browser) => {
        setBrowserType(browser);
    };

    if (!isVisible) return null;

    const bannerClass = `browser-banner ${browserType} ${isCollapsed ? 'collapsed' : ''}`;

    const renderTabContent = () => {
        switch (activeTab) {
            case 'basic':
                return <BrowserInfo onBrowserDetect={handleBrowserDetect} />;
            case 'connection':
                return <ConnectionInfo />;
            case 'device':
                return <DeviceDetails />;
            case 'features':
                return <FeatureSupport />;
            case 'logs':
                return <LogViewer 
                    isAdminLoggedIn={isAdminLoggedIn} 
                    defaultSessionUUID={currentSessionUUID}
                />;
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

export default TelemetryBanner;
