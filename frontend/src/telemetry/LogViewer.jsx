import React, { useState, useEffect, useRef } from 'react';
import { getSessionUUID } from '../utils/sessionManager';
import { API_CONFIG } from '../configs';

const LogViewer = ({ isAdminLoggedIn }) => {
    const currentSessionUUID = getSessionUUID();
    const [logs, setLogs] = useState([]);
    const [showNoteInput, setShowNoteInput] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [sessionUUIDInput, setSessionUUIDInput] = useState(currentSessionUUID);
    const logsRef = useRef(null);
    const noteInputRef = useRef(null);

    const getAuthHeader = () => {
        const token = localStorage.getItem('adminToken');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    };

    const scrollToBottom = () => {
        if (logsRef.current) {
            logsRef.current.scrollTop = logsRef.current.scrollHeight;
        }
    };

    const fetchLogs = async (isManualRefresh = false) => {
        try {
            // Trim whitespace from each UUID
            const cleanedUUIDs = sessionUUIDInput.split(',')
                .map(uuid => uuid.trim())
                .filter(uuid => uuid) // Remove empty strings
                .join(',');

            const response = await fetch(`${API_CONFIG.baseUrl}/api/logs?session_uuid=${cleanedUUIDs}`, {
                headers: getAuthHeader()
            });
            if (response.ok) {
                const data = await response.json();
                setLogs(data.logs);
                if (isManualRefresh) {
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
    }, [sessionUUIDInput]);

    useEffect(() => {
        scrollToBottom();
    }, [logs]);

    useEffect(() => {
        if (showNoteInput && noteInputRef.current) {
            noteInputRef.current.focus();
        }
    }, [showNoteInput]);

    const handleAddNote = async () => {
        if (!noteText.trim()) return;

        try {
            const response = await fetch(`${API_CONFIG.baseUrl}/api/log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeader()
                },
                body: JSON.stringify({
                    message: `[NOTE] ${noteText}`,
                    sessionUUID: currentSessionUUID
                }),
            });

            if (response.ok) {
                setNoteText('');
                setShowNoteInput(false);
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

    const handleSessionUUIDChange = (e) => {
        setSessionUUIDInput(e.target.value);
    };

    const handleSessionUUIDKeyPress = (e) => {
        if (e.key === 'Enter') {
            fetchLogs(true);
        }
    };

    return (
        <div className="tab-content">
            <div className="logs-header">
                <input
                    type="text"
                    className="session-uuid-input"
                    value={sessionUUIDInput}
                    onChange={handleSessionUUIDChange}
                    onKeyPress={handleSessionUUIDKeyPress}
                    placeholder={sessionUUIDInput}
                    title="Session UUIDs"
                />
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
};

export default LogViewer;
