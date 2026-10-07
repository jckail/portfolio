import type { Message } from '../../../types/chat';

export const CHAT_STORAGE_KEY = 'portfolio_chat_messages_v1';

export const WELCOME_MESSAGE: Message = {
  type: 'agent',
  text: "I'm Jordan's AI portfolio assistant. I can build a concise recruiter brief, compare a job description with his experience, explore his engineering work, or help draft an introduction. I'll separate portfolio evidence from missing information. What would you like to find out?",
};

/** Persist only completed (non-streaming) messages. */
export function saveChatMessages(messages: Message[]): void {
  try {
    const toStore = messages
      .filter((m) => !m.isStreaming)
      .map(({ type, text }) => ({ type, text }));
    sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toStore));
  } catch {
    // Quota / private mode — ignore
  }
}

export function loadChatMessages(): Message[] | null {
  try {
    const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const messages: Message[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item === 'object' &&
        (item as Message).type &&
        typeof (item as Message).text === 'string' &&
        ((item as Message).type === 'user' || (item as Message).type === 'agent')
      ) {
        messages.push({
          type: (item as Message).type,
          text: (item as Message).text,
        });
      }
    }
    return messages.length > 0 ? messages : null;
  } catch {
    return null;
  }
}

export function clearChatMessages(): void {
  try {
    sessionStorage.removeItem(CHAT_STORAGE_KEY);
  } catch {
    // ignore
  }
}
