import { postJson } from './api';
export type ContactIntent = 'opportunity' | 'collaboration' | 'question';
const cached = new Map<ContactIntent, { expires: number; promise: Promise<string> }>();
/** Public-only drafts: visitor identity never leaves the browser for generation. */
export function recommendContactMessage(intent: ContactIntent): Promise<string> {
  const existing = cached.get(intent);
  if (existing && existing.expires > Date.now()) return existing.promise;
  const promise = postJson<{ message: string }>('/api/contact/draft', { intent }, {
    signal: AbortSignal.timeout(18000),
  }).then(result => {
    if (typeof result?.message !== 'string' || !result.message.trim() || result.message.length > 1200) {
      throw new Error('Recommendation unavailable');
    }
    return result.message.trim();
  }).catch(error => { cached.delete(intent); throw error; });
  cached.set(intent, { expires: Date.now() + 300000, promise });
  return promise;
}

