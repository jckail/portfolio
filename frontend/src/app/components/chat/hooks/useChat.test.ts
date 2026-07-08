import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { useChat } from './useChat';

vi.mock('../../../../shared/utils/analytics', () => ({
  trackChatMessage: vi.fn().mockResolvedValue(undefined),
  getSessionId: () => 'sid_test',
}));

/** Minimal WebSocket stand-in: jsdom does not implement WebSocket. */
class FakeWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static instances: FakeWebSocket[] = [];

  url: string;
  readyState = FakeWebSocket.CONNECTING;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = 3;
    this.onclose?.();
  }

  /** Test helpers */
  simulateOpen() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  simulateMessage(payload: unknown) {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }
}

describe('useChat', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts closed with the welcome message', () => {
    const { result } = renderHook(() => useChat());
    expect(result.current.open).toBe(false);
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].type).toBe('agent');
  });

  it('opens when the URL contains ?ai_chat=open', () => {
    window.history.replaceState({}, '', '/?ai_chat=open');
    const { result } = renderHook(() => useChat());
    expect(result.current.open).toBe(true);
  });

  it('syncs the open state to the URL', () => {
    const { result } = renderHook(() => useChat());

    act(() => {
      result.current.setOpen(true);
    });
    expect(new URLSearchParams(window.location.search).get('ai_chat')).toBe('open');

    act(() => {
      result.current.setOpen(false);
    });
    expect(new URLSearchParams(window.location.search).has('ai_chat')).toBe(false);
  });

  it('creates only one socket for repeated opens', () => {
    const { result } = renderHook(() => useChat());

    act(() => {
      result.current.initializeChat();
      result.current.initializeChat();
    });

    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('sends page context when the socket opens', () => {
    const { result } = renderHook(() => useChat());

    act(() => {
      result.current.initializeChat();
      FakeWebSocket.instances[0].simulateOpen();
    });

    const first = JSON.parse(FakeWebSocket.instances[0].sent[0]);
    expect(first.type).toBe('context');
  });

  it('queues a message sent before the socket opens, then flushes it', async () => {
    const { result } = renderHook(() => useChat());

    act(() => {
      result.current.setMessage('hello there');
    });
    await act(async () => {
      await result.current.handleSendMessage();
    });

    // The user message appears immediately and loading starts
    expect(result.current.messages.at(-1)).toMatchObject({
      type: 'user',
      text: 'hello there',
    });
    expect(result.current.isLoading).toBe(true);

    // Nothing sent yet; opening the socket flushes the queue after context
    const ws = FakeWebSocket.instances[0];
    expect(ws.sent).toHaveLength(0);
    act(() => {
      ws.simulateOpen();
    });
    const frames = ws.sent.map(raw => JSON.parse(raw));
    expect(frames[0].type).toBe('context');
    expect(frames[1]).toMatchObject({ type: 'message', content: 'hello there' });
  });

  it('accumulates streamed chunks into a single assistant message', () => {
    const { result } = renderHook(() => useChat());

    act(() => {
      result.current.initializeChat();
      FakeWebSocket.instances[0].simulateOpen();
    });

    const ws = FakeWebSocket.instances[0];
    act(() => {
      ws.simulateMessage({ message: 'Hel', sender: 'assistant', is_chunk: true });
      ws.simulateMessage({ message: 'lo!', sender: 'assistant', is_chunk: true });
    });

    expect(result.current.messages.at(-1)).toMatchObject({
      type: 'agent',
      text: 'Hello!',
      isStreaming: true,
    });

    // Empty completion frame finalizes the message and clears loading
    act(() => {
      ws.simulateMessage({ message: '', sender: 'assistant', is_chunk: false });
    });
    expect(result.current.messages.at(-1)).toMatchObject({
      type: 'agent',
      text: 'Hello!',
      isStreaming: false,
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('survives malformed frames without crashing', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useChat());

    act(() => {
      result.current.initializeChat();
      FakeWebSocket.instances[0].simulateOpen();
    });

    act(() => {
      FakeWebSocket.instances[0].onmessage?.({ data: 'not json {{' });
    });

    expect(result.current.messages).toHaveLength(1);
    consoleError.mockRestore();
  });

  it('closes the socket on unmount', () => {
    const { result, unmount } = renderHook(() => useChat());

    act(() => {
      result.current.initializeChat();
      FakeWebSocket.instances[0].simulateOpen();
    });

    unmount();
    expect(FakeWebSocket.instances[0].readyState).toBe(3);
  });
});
