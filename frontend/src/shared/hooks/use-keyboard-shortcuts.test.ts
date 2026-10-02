import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';

import { useKeyboardShortcuts } from './use-keyboard-shortcuts';
import { pushDialog, removeDialog } from './dialog-stack';
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
  it('leaves modal button shortcuts to the active dialog', () => {
    renderHook(() => useKeyboardShortcuts());
    const dialog = document.createElement('div');
    const button = document.createElement('button');
    dialog.appendChild(button);
    document.body.appendChild(dialog);
    const id = Symbol('test-dialog');
    pushDialog(id, dialog);
    button.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
    expect(chatParam()).toBeNull();
    removeDialog(id);
    dialog.remove();
  });

  it('respects a modal outside the shared dialog stack', () => {
    renderHook(() => useKeyboardShortcuts());
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    const button = document.createElement('button');
    dialog.appendChild(button);
    document.body.appendChild(dialog);
    button.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
    expect(chatParam()).toBeNull();
    dialog.remove();
  });

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
