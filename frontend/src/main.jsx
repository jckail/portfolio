import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Queue to store logs while backend is not available
let logQueue = [];
let isProcessingQueue = false;

// Process queued logs
const processLogQueue = async () => {
    if (isProcessingQueue || logQueue.length === 0) return;
    
    isProcessingQueue = true;
    while (logQueue.length > 0) {
        const { level, args } = logQueue[0];
        try {
            const message = `[${level}] ${args.join(' ')}`;
            const response = await fetch('/api/log', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message }),
            });
            
            if (response.ok) {
                logQueue.shift(); // Remove processed log
            } else {
                break; // Stop processing if we encounter an error
            }
        } catch (error) {
            break; // Stop processing if we encounter an error
        }
    }
    isProcessingQueue = false;
};

// Custom logging function that sends logs to backend
const logToFile = async (level, args) => {
    // Add to queue
    logQueue.push({ level, args });
    
    // Try to process queue
    processLogQueue();
    
    // If queue gets too large, remove oldest items
    if (logQueue.length > 1000) {
        logQueue = logQueue.slice(-1000);
    }
};

// Override console methods
['log', 'warn', 'error', 'info', 'debug'].forEach(level => {
    const original = console[level];
    console[level] = (...args) => {
        logToFile(level, args);
        original.apply(console, args); // Keep browser output intact
    };
});

// Periodically try to process queued logs
setInterval(processLogQueue, 5000);

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
