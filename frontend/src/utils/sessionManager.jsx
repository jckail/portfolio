// Generate a UUID v4
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// Get or create session UUID
export const getSessionUUID = () => {
    let sessionUUID = localStorage.getItem('sessionUUID');
    if (!sessionUUID) {
        sessionUUID = generateUUID();
        localStorage.setItem('sessionUUID', sessionUUID);
    }
    return sessionUUID;
};

// Clear session UUID (useful for testing or manual session reset)
export const clearSessionUUID = () => {
    localStorage.removeItem('sessionUUID');
};
