import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';

import { useKeyboardShortcuts } from './use-keyboard-shortcuts';
import { setChatAvailable } from '../utils/chat-availability';

const press = (key: string) => {
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
};
const chatParam = () => new URLSearchParams(window.location.search).get('ai_chat');

beforeEach(() => {
  window.history.replaceState({}, '', '/');
  setChatAvailable(true);
});

afterEach(() => {
  cleanup();
  setChatAvailable(true);
});

describe('useKeyboardShortcuts', () => {
  it('opens the chat on ?', () => {
    renderHook(() => useKeyboardShortcuts());
    press('?');
    expect(chatParam()).toBe('open');
  });

  it('leaves ? alone when the assistant is unavailable', () => {
    renderHook(() => useKeyboardShortcuts());
    setChatAvailable(false);
    press('?');
    expect(chatParam()).toBeNull();
  });
});
