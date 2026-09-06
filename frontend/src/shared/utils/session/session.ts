/**
 * Generate a UUID v4.
 *
 * Prefers the platform CSPRNG: this id keys server-side telemetry and log
 * records, so `Math.random()` output — which is predictable and can collide
 * across visitors — is only a last-resort fallback for ancient browsers.
 * @returns A UUID v4 string
 */
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
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
