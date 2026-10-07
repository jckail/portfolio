import { endpoints, getJson } from '../../shared/utils/api';

export interface AccessReceipt { token: string; expires_at: string; mode?: 'trial' | 'full'; remaining_messages?: number }
const KEY = 'portfolio_agent_access';

export function validReceipt(value: unknown): value is AccessReceipt {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<AccessReceipt>;
  return typeof data.token === 'string' && data.token.length > 0 && data.token.length <= 512
    && typeof data.expires_at === 'string' && Date.parse(data.expires_at) > Date.now()
    && (data.mode === undefined || data.mode === 'full' || (data.mode === 'trial'
      && Number.isInteger(data.remaining_messages) && data.remaining_messages! >= 0 && data.remaining_messages! <= 2));
}

export function loadReceipt(): AccessReceipt | null {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
    if (validReceipt(value)) return value;
    clearReceipt();
  } catch { /* Storage can be unavailable. Access can still live in memory. */ }
  return null;
}
export function saveReceipt(receipt: AccessReceipt) {
  try { sessionStorage.setItem(KEY, JSON.stringify(receipt)); } catch { /* Memory only. */ }
}
export function clearReceipt() {
  try { sessionStorage.removeItem(KEY); } catch { /* Storage unavailable. */ }
}
export async function requestAccess(email: string, company: string): Promise<AccessReceipt> {
  const receipt = await getJson<unknown>(endpoints.agentAccess, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), company: company.trim() }),
  });
  if (!validReceipt(receipt)) throw new Error('Access could not be confirmed. Please try again.');
  return receipt;
}
export async function verifyReceipt(receipt: AccessReceipt): Promise<AccessReceipt> {
  const result = await getJson<{ valid?: boolean; expires_at?: string; mode?: 'trial' | 'full'; remaining_messages?: number }>(endpoints.agentAccess, {
    headers: { Authorization: `Bearer ${receipt.token}` },
  });
  const verified = { token: receipt.token, expires_at: result.expires_at, ...(result.mode ? { mode: result.mode, ...(result.mode === 'trial' ? { remaining_messages: result.remaining_messages } : {}) } : {}) };
  if (result.valid !== true || !validReceipt(verified)) throw new Error('Access expired.');
  return verified;
}
export async function requestTrial(): Promise<AccessReceipt> {
  const receipt = await getJson<unknown>(endpoints.agentTrial, { method: 'POST' });
  if (!validReceipt(receipt) || receipt.mode !== 'trial') throw new Error('Trial access unavailable.');
  return receipt;
}
