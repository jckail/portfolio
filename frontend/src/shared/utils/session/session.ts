/**
 * Generate a UUID v4
 * @returns A UUID v4 string
 */
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Get or create session UUID
 * @returns The current session UUID
 */
export const getSessionUUID = (): string => {
  let sessionUUID = localStorage.getItem('sessionUUID');
  if (!sessionUUID) {
    sessionUUID = generateUUID();
    localStorage.setItem('sessionUUID', sessionUUID);
  }
  return sessionUUID;
};

/**
 * Clear session UUID (useful for testing or manual session reset)
 */
export const clearSessionUUID = (): void => {
  localStorage.removeItem('sessionUUID');
};
