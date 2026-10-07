import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clearReceipt, loadReceipt, requestAccess, requestTrial, saveReceipt, verifyReceipt, validReceipt } from './access';

const getJson = vi.fn();
vi.mock('../../shared/utils/api', async importOriginal => ({ ...await importOriginal<typeof import('../../shared/utils/api')>(), getJson: (...args: unknown[]) => getJson(...args) }));
const receipt = { token: 'opaque-signed-token', expires_at: new Date(Date.now() + 3600000).toISOString() };
beforeEach(() => { sessionStorage.clear(); localStorage.clear(); getJson.mockReset(); });

describe('assistant access receipts', () => {
  it('requests anonymous access and restores the authoritative remaining count', async () => {
    const trial = { ...receipt, mode: 'trial', remaining_messages: 2 };
    getJson.mockResolvedValue(trial);
    expect(await requestTrial()).toEqual(trial);
    expect(getJson).toHaveBeenCalledWith('/api/agent/trial', { method: 'POST' });
    getJson.mockResolvedValue({ valid: true, ...trial, remaining_messages: 0 });
    expect(await verifyReceipt(trial as Parameters<typeof verifyReceipt>[0])).toEqual({ ...trial, remaining_messages: 0 });
  });
  it.each([{ mode: 'admin' }, { mode: 'trial' }, { mode: 'trial', remaining_messages: 3 }, { mode: 'trial', remaining_messages: -1 }])('rejects malformed access metadata %o', metadata => {
    expect(validReceipt({ ...receipt, ...metadata })).toBe(false);
  });
  it('submits an introduction and persists only the receipt in tab storage', async () => {
    getJson.mockResolvedValue(receipt);
    const granted = await requestAccess(' visitor@example.com ', ' Acme ');
    expect(getJson).toHaveBeenCalledWith('/api/agent/access', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ email: 'visitor@example.com', company: 'Acme' }),
    }));
    saveReceipt(granted);
    expect(loadReceipt()).toEqual(receipt);
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.getItem('portfolio_agent_access')).not.toContain('visitor@example.com');
    expect(sessionStorage.getItem('portfolio_agent_access')).not.toContain('Acme');
  });
  it('rejects a missing or expired receipt and clears it', async () => {
    sessionStorage.setItem('portfolio_agent_access', JSON.stringify({ token: 'old', expires_at: '2000-01-01' }));
    expect(loadReceipt()).toBeNull();
    expect(sessionStorage.getItem('portfolio_agent_access')).toBeNull();
    getJson.mockResolvedValue({ token: 'old', expires_at: '2000-01-01' });
    await expect(requestAccess('visitor@example.com', 'Acme')).rejects.toThrow();
  });
  it('checks restored access with a bearer header and no URL credentials', async () => {
    getJson.mockResolvedValue({ valid: true, expires_at: receipt.expires_at });
    expect(await verifyReceipt(receipt)).toEqual(receipt);
    expect(getJson).toHaveBeenCalledWith('/api/agent/access', { headers: { Authorization: 'Bearer opaque-signed-token' } });
    clearReceipt(); expect(loadReceipt()).toBeNull();
  });
  it('refuses an invalid server verification', async () => {
    getJson.mockResolvedValue({ valid: false, expires_at: receipt.expires_at });
    await expect(verifyReceipt(receipt)).rejects.toThrow();
  });
});
