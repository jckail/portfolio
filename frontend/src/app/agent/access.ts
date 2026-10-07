import { getJson } from '../../shared/utils/api';

export interface AccessReceipt { token: string; expires_at: string }
const KEY = 'portfolio_agent_access';

export function validReceipt(value: unknown): value is AccessReceipt {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<AccessReceipt>;
  return typeof data.token === 'string' && data.token.length > 0 && data.token.length <= 512
    && typeof data.expires_at === 'string' && Date.parse(data.expires_at) > Date.now();
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
  const receipt = await getJson<unknown>('/api/agent/access', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), company: company.trim() }),
  });
  if (!validReceipt(receipt)) throw new Error('Access could not be confirmed. Please try again.');
  return receipt;
}
export async function verifyReceipt(receipt: AccessReceipt): Promise<AccessReceipt> {
  const result = await getJson<{ valid?: boolean; expires_at?: string }>('/api/agent/access', {
    headers: { Authorization: `Bearer ${receipt.token}` },
  });
  const verified = { token: receipt.token, expires_at: result.expires_at };
  if (result.valid !== true || !validReceipt(verified)) throw new Error('Access expired.');
  return verified;
}
