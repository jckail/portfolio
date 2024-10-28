import { API_CONFIG } from '../configs';

// Queue to store logs while backend is not available
let logQueue = [];
let isProcessingQueue = false;
let processingTimeout = null;

const BATCH_SIZE = 50; // Number of logs to send in one request
const MAX_QUEUE_SIZE = 1000; // Maximum number of logs to keep in queue
const PROCESSING_INTERVAL = 5000; // Process every 5 seconds if queue doesn't reach batch size

const formatTimestamp = () => {
    return new Date().toISOString() + 'Z';
};

const formatLogMessage = (level, args, sessionUUID) => {
    const timestamp = formatTimestamp();
    return `[${timestamp}] [${level}] [${sessionUUID}] ${args.join(' ')}`;
};

// Process queued logs in batches
const processLogQueue = async () => {
    if (isProcessingQueue || logQueue.length === 0) return;
    
    isProcessingQueue = true;
    clearTimeout(processingTimeout);
    
    try {
        // Process logs in batches
        while (logQueue.length > 0) {
            // Take a batch of logs
            const batch = logQueue.slice(0, BATCH_SIZE);
            
            // Format all messages in the batch
            const messages = batch.map(({ level, args, sessionUUID }) => ({
                message: formatLogMessage(level, args, sessionUUID),
                sessionUUID
            }));
            
            // Send batch to server
            const response = await fetch(`${API_CONFIG.baseUrl}/api/log/batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ logs: messages }),
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.status === 'success') {
                    // Remove processed logs from queue
                    logQueue = logQueue.slice(batch.length);
                } else {
                    console.error('Failed to process log batch:', result.message);
                    break;
                }
            } else {
                console.error('Failed to send logs to server:', response.statusText);
                break;
            }
            
            // Add a small delay between batches to prevent overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    } catch (error) {
        console.error('Error processing log batch:', error);
    } finally {
        isProcessingQueue = false;
        // Schedule next processing
        scheduleProcessing();
    }
};

// Schedule processing if not already scheduled
const scheduleProcessing = () => {
    if (!processingTimeout) {
        processingTimeout = setTimeout(processLogQueue, PROCESSING_INTERVAL);
    }
};

// Custom logging function that sends logs to backend
export const logToFile = async (level, args, sessionUUID) => {
    // Add to queue
    logQueue.push({ level, args, sessionUUID });
    
    // If queue gets too large, remove oldest items
    if (logQueue.length > MAX_QUEUE_SIZE) {
        logQueue = logQueue.slice(-MAX_QUEUE_SIZE);
    }

    // Process immediately if we've reached batch size
    if (logQueue.length >= BATCH_SIZE) {
        processLogQueue();
    } else {
        // Schedule processing if not already scheduled
        scheduleProcessing();
    }
};

export const startQueueProcessing = () => {
    // Initial scheduling
    scheduleProcessing();
    
    // Clean up function for component unmount
    return () => {
        if (processingTimeout) {
            clearTimeout(processingTimeout);
        }
    };
};
