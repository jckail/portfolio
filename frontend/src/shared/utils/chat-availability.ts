/**
 * Whether the AI assistant can be used, as last reported by `/api/chat/status`.
 *
 * ChatPortal owns the status check; everything else that offers a way into the
 * chat (the hero link, the command palette, the `?` shortcut) reads this so it
 * can hide itself instead of opening nothing. Optimistic by default: a failed
 * status request keeps the assistant offered, since the chat surfaces its own
 * connection errors.
 */
let available = true;
const listeners = new Set<() => void>();

export function isChatAvailable(): boolean {
  return available;
}

export function setChatAvailable(next: boolean): void {
  if (next === available) return;
  available = next;
  listeners.forEach(listener => listener());
}

export function subscribeChatAvailability(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
