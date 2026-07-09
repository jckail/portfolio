import { describe, it, expect, beforeEach } from 'vitest';

import {
  CHAT_STORAGE_KEY,
  WELCOME_MESSAGE,
  saveChatMessages,
  loadChatMessages,
  clearChatMessages,
} from './chat-storage';

describe('chat-storage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('returns null when nothing is stored', () => {
    expect(loadChatMessages()).toBeNull();
  });

  it('round-trips messages and drops streaming ones', () => {
    saveChatMessages([
      WELCOME_MESSAGE,
      { type: 'user', text: 'hi' },
      { type: 'agent', text: 'hello', isStreaming: true },
      { type: 'agent', text: 'done' },
    ]);

    const loaded = loadChatMessages();
    expect(loaded).toEqual([
      { type: 'agent', text: WELCOME_MESSAGE.text },
      { type: 'user', text: 'hi' },
      { type: 'agent', text: 'done' },
    ]);
  });

  it('rejects malformed stored data', () => {
    sessionStorage.setItem(CHAT_STORAGE_KEY, '{"not":"an array"}');
    expect(loadChatMessages()).toBeNull();

    sessionStorage.setItem(
      CHAT_STORAGE_KEY,
      JSON.stringify([{ type: 'hacker', text: 'nope' }])
    );
    expect(loadChatMessages()).toBeNull();
  });

  it('clears stored messages', () => {
    saveChatMessages([WELCOME_MESSAGE]);
    clearChatMessages();
    expect(loadChatMessages()).toBeNull();
  });
});
