import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { useChat, getChatSessionId } from './useChat';
import { CHAT_STORAGE_KEY, WELCOME_MESSAGE } from '../chat-storage';
import { COOKIE_CONSENT_KEY } from '../../../../shared/utils/cookie-consent';

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
  onclose: ((event: { code: number; reason: string }) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = 3;
    this.onclose?.({ code: 1000, reason: '' });
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
    sessionStorage.clear();
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
    expect(result.current.showSuggestions).toBe(true);
  });

  it('restores messages from sessionStorage', () => {
    sessionStorage.setItem(
      CHAT_STORAGE_KEY,
      JSON.stringify([
        WELCOME_MESSAGE,
        { type: 'user', text: 'prior question' },
        { type: 'agent', text: 'prior answer' },
      ])
    );
    const { result } = renderHook(() => useChat());
    expect(result.current.messages).toHaveLength(3);
    expect(result.current.messages[1].text).toBe('prior question');
    expect(result.current.showSuggestions).toBe(false);
  });

  it('sends a suggested prompt as a user message', async () => {
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.handleSuggestedPrompt('What did Jordan do at Meta?');
    });

    expect(result.current.messages.at(-1)).toMatchObject({
      type: 'user',
      text: 'What did Jordan do at Meta?',
    });
    expect(result.current.showSuggestions).toBe(false);
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

  it('leaves admin telemetry and marked subtrees out of page context', () => {
    const root = document.createElement('div');
    root.id = 'root';
    root.innerHTML =
      '<p>public resume text</p>' +
      '<div class="telemetry-banner">console: secret admin log</div>' +
      '<div data-no-chat-context>hidden widget</div>' +
      '<div class="cookie-banner">cookie text</div>';
    document.body.appendChild(root);
    try {
      const { result } = renderHook(() => useChat());
      act(() => {
        result.current.initializeChat();
        FakeWebSocket.instances[0].simulateOpen();
      });
      const context = JSON.parse(
        JSON.parse(FakeWebSocket.instances[0].sent[0]).content
      ).text as string;
      expect(context).toContain('public resume text');
      expect(context).not.toContain('secret admin log');
      expect(context).not.toContain('hidden widget');
      expect(context).not.toContain('cookie text');
    } finally {
      root.remove();
    }
  });

  describe('chat session id', () => {
    afterEach(() => {
      localStorage.removeItem(COOKIE_CONSENT_KEY);
    });

    it('uses a random chat id, not the analytics id, without consent', () => {
      const id = getChatSessionId();
      expect(id).toMatch(/^chat_/);
      expect(id).not.toBe('sid_test');
      // Stable within the tab so stored turns stay grouped
      expect(getChatSessionId()).toBe(id);
    });

    it('keeps an independent chat session even with saved analytics acceptance', () => {
      localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
      expect(getChatSessionId()).toMatch(/^chat_/);
      expect(sessionStorage.getItem('ga_session_id')).toBeNull();
    });

    it('sends the chat id in the ga_session_id field the backend reads', async () => {
      const { result } = renderHook(() => useChat());
      act(() => {
        result.current.initializeChat();
        FakeWebSocket.instances[0].simulateOpen();
      });
      await act(async () => {
        await result.current.handleSuggestedPrompt('hi');
      });
      const frames = FakeWebSocket.instances[0].sent.map(raw => JSON.parse(raw));
      const message = frames.find(f => f.type === 'message');
      expect(message.ga_session_id).toMatch(/^chat_/);
    });
  });

  it('replays persisted history to the server on reconnect', () => {
    sessionStorage.setItem(
      CHAT_STORAGE_KEY,
      JSON.stringify([
        WELCOME_MESSAGE,
        { type: 'user', text: 'prior question' },
        { type: 'agent', text: 'prior answer' },
      ])
    );
    const { result } = renderHook(() => useChat());

    act(() => {
      result.current.initializeChat();
      FakeWebSocket.instances[0].simulateOpen();
    });

    const frames = FakeWebSocket.instances[0].sent.map(raw => JSON.parse(raw));
    expect(frames[0].type).toBe('context');
    expect(frames[1]).toMatchObject({
      type: 'history',
      messages: [
        { role: 'user', content: 'prior question' },
        { role: 'assistant', content: 'prior answer' },
      ],
    });
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

  describe('confirm_action frames', () => {
    const frame = {
      type: 'confirm_action',
      id: 'act_1',
      tool: 'contact_jordan',
      args: { subject: 'Hello', message: 'Hi Jordan' },
      needs: ['email'],
    };

    function openWithCard() {
      const hook = renderHook(() => useChat());
      act(() => {
        hook.result.current.initializeChat();
        FakeWebSocket.instances[0].simulateOpen();
      });
      const ws = FakeWebSocket.instances[0];
      act(() => ws.simulateMessage(frame));
      return { ...hook, ws };
    }

    const sentTypes = (ws: FakeWebSocket) => ws.sent.map(s => JSON.parse(s).type);

    it('shows a pending card and sends nothing', () => {
      const { result, ws } = openWithCard();
      expect(result.current.pendingActions).toHaveLength(1);
      expect(result.current.pendingActions[0]).toMatchObject({ id: 'act_1', status: 'pending' });
      expect(sentTypes(ws)).not.toContain('confirm_action');
      expect(sentTypes(ws)).not.toContain('cancel_action');
    });

    it('ignores duplicate frames, unknown tools and missing ids', () => {
      const { result, ws } = openWithCard();
      act(() => {
        ws.simulateMessage(frame);
        ws.simulateMessage({ ...frame, id: 'x', tool: 'drop_tables' });
        ws.simulateMessage({ ...frame, id: undefined });
      });
      expect(result.current.pendingActions).toHaveLength(1);
    });

    it('rejects an invalid email without sending', () => {
      const { result, ws } = openWithCard();
      let errors: Record<string, string> | null = null;
      act(() => {
        errors = result.current.confirmAction('act_1', 'not-an-email', frame.args);
      });
      expect(errors).toHaveProperty('email');
      expect(sentTypes(ws)).not.toContain('confirm_action');
      expect(result.current.pendingActions[0].status).toBe('pending');
    });

    it('rejects an empty subject or message', () => {
      const { result } = openWithCard();
      let errors: Record<string, string> | null = null;
      act(() => {
        errors = result.current.confirmAction('act_1', 'a@b.co', { subject: ' ', message: '' });
      });
      expect(errors).toHaveProperty('subject');
      expect(errors).toHaveProperty('message');
    });

    it('sends the visitor email and edited args only on confirm', () => {
      const { result, ws } = openWithCard();
      let errors: Record<string, string> | null = {};
      act(() => {
        errors = result.current.confirmAction('act_1', ' me@example.com ', { subject: 'S', message: 'Edited' });
      });
      expect(errors).toBeNull();
      const sent = JSON.parse(ws.sent.at(-1) as string);
      expect(sent).toEqual({
        type: 'confirm_action',
        id: 'act_1',
        email: 'me@example.com',
        args: { subject: 'S', message: 'Edited' },
      });
      expect(result.current.pendingActions[0].status).toBe('submitting');

      // A second press while submitting sends nothing more.
      const count = ws.sent.length;
      act(() => {
        result.current.confirmAction('act_1', 'me@example.com', frame.args);
      });
      expect(ws.sent).toHaveLength(count);
    });

    it('sends cancel_action once and marks the card cancelled', () => {
      const { result, ws } = openWithCard();
      act(() => result.current.cancelAction('act_1'));
      act(() => result.current.cancelAction('act_1'));
      expect(ws.sent.filter(s => JSON.parse(s).type === 'cancel_action')).toHaveLength(1);
      expect(result.current.pendingActions[0].status).toBe('cancelled');
    });

    it('renders a success result and keeps the phone in memory only', () => {
      const { result, ws } = openWithCard();
      act(() => {
        result.current.confirmAction('act_1', 'me@example.com', frame.args);
      });
      act(() =>
        ws.simulateMessage({ type: 'action_result', id: 'act_1', ok: true, tool: 'request_phone', message: 'Sent.', phone: '+1 555 0100' })
      );
      expect(result.current.pendingActions[0]).toMatchObject({ status: 'done', resultMessage: 'Sent.', phone: '+1 555 0100' });
      expect(sessionStorage.getItem(CHAT_STORAGE_KEY) ?? '').not.toContain('555');
    });

    it('does not take a phone number from a failed result', () => {
      const { result, ws } = openWithCard();
      act(() => {
        result.current.confirmAction('act_1', 'me@example.com', frame.args);
      });
      act(() =>
        ws.simulateMessage({ type: 'action_result', id: 'act_1', ok: false, message: 'Try later.', phone: '+1 555 0100' })
      );
      expect(result.current.pendingActions[0].status).toBe('failed');
      expect(result.current.pendingActions[0].phone).toBeUndefined();
    });

    it('expires pending cards when the socket closes', () => {
      const { result, ws } = openWithCard();
      act(() => ws.close());
      expect(result.current.pendingActions[0].status).toBe('expired');
    });

    it('expires a card after the ten minute window', () => {
      vi.useFakeTimers();
      try {
        const { result } = openWithCard();
        act(() => {
          vi.advanceTimersByTime(10 * 60 * 1000 + 100);
        });
        expect(result.current.pendingActions[0].status).toBe('expired');
      } finally {
        vi.useRealTimers();
      }
    });
  });
});

describe('gated full-page chat protocol', () => {
  beforeEach(() => {
    sessionStorage.clear(); window.history.replaceState({}, '', '/agent?theme=dark');
    FakeWebSocket.instances = []; vi.stubGlobal('WebSocket', FakeWebSocket);
  });
  afterEach(() => vi.unstubAllGlobals());
  it('waits for a credential and handles trial quota frames without treating them as replies', async () => {
    const onAccessStatus = vi.fn(); const onAccessRequired = vi.fn();
    const { result, rerender } = renderHook(({ enabled }) => useChat({ fullPage: true, accessToken: 'trial', enabled, onAccessStatus, onAccessRequired }), { initialProps: { enabled: false } });
    expect(FakeWebSocket.instances).toHaveLength(0);
    rerender({ enabled: true });
    const ws = FakeWebSocket.instances[0]; act(() => ws.simulateOpen());
    await act(async () => result.current.handleSuggestedPrompt('Tell me about Jordan'));
    act(() => ws.simulateMessage({ type: 'access_status', mode: 'trial', remaining_messages: 0 }));
    expect(onAccessStatus).toHaveBeenCalledWith(0);
    expect(result.current.isLoading).toBe(true);
    act(() => ws.simulateMessage({ type: 'message', message: 'Jordan builds agent platforms.' }));
    expect(result.current.isLoading).toBe(false);
    act(() => ws.simulateMessage({ type: 'access_required' }));
    expect(onAccessRequired).toHaveBeenCalledOnce();
    expect(result.current.messages.at(-1)?.text).toBe('Jordan builds agent platforms.');
  });
  it('upgrades credentials preserving draft and history while retiring connection-bound confirmations', async () => {
    const { result, rerender } = renderHook(({ token }) => useChat({ fullPage: true, accessToken: token }), { initialProps: { token: 'trial' } });
    const old = FakeWebSocket.instances[0]; act(() => old.simulateOpen());
    await act(async () => result.current.handleSuggestedPrompt('Connect me with Jordan'));
    act(() => {
      old.simulateMessage({ message: 'Here is a draft.' });
      old.simulateMessage({ type: 'confirm_action', id: 'trial-proposal', tool: 'contact_jordan', args: { subject: 'Intro', message: 'Hi' } });
      result.current.setMessage('Keep this draft');
    });
    rerender({ token: 'full' });
    expect(old.readyState).toBe(3);
    expect(result.current.message).toBe('Keep this draft');
    expect(result.current.pendingActions[0].status).toBe('expired');
    const upgraded = FakeWebSocket.instances[1]; act(() => upgraded.simulateOpen());
    expect(upgraded.url).not.toBe(old.url);
    expect(JSON.parse(upgraded.sent[0])).toEqual({ type: 'access', token: 'full' });
    expect(upgraded.sent.some(frame => JSON.parse(frame).type === 'history')).toBe(true);
    act(() => old.simulateMessage({ message: 'Stale old reply' }));
    expect(result.current.messages.at(-1)?.text).toBe('Here is a draft.');
  });
  it.each([401, 200, 503])('checks access after a dropped close frame (HTTP %s)', async status => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status }));
    vi.stubGlobal('fetch', fetchMock);
    const onAccessExpired = vi.fn();
    renderHook(() => useChat({ fullPage: true, accessToken: 'signed-access', onAccessExpired }));
    await act(async () => FakeWebSocket.instances[0].onclose?.({ code: 1006, reason: '' }));
    expect(fetchMock).toHaveBeenCalledWith('/api/agent/access', {
      headers: { Authorization: 'Bearer signed-access' }, signal: expect.any(AbortSignal),
    });
    expect(onAccessExpired).toHaveBeenCalledTimes(status === 401 ? 1 : 0);
  });
  it('keeps access retryable when the verification request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network unavailable')));
    const onAccessExpired = vi.fn();
    renderHook(() => useChat({ fullPage: true, accessToken: 'signed-access', onAccessExpired }));
    await act(async () => FakeWebSocket.instances[0].onclose?.({ code: 1006, reason: '' }));
    expect(onAccessExpired).not.toHaveBeenCalled();
  });
  it.each(['unmount', 'new connection', 'new token'])('ignores a delayed rejection after %s', async change => {
    let resolve!: (response: Response) => void;
    const fetchMock = vi.fn().mockImplementation(() => new Promise<Response>(done => { resolve = done; }));
    vi.stubGlobal('fetch', fetchMock);
    const onAccessExpired = vi.fn();
    const { result, unmount, rerender } = renderHook(
      ({ token }) => useChat({ fullPage: true, accessToken: token, onAccessExpired }),
      { initialProps: { token: 'signed-access' } },
    );
    const ws = FakeWebSocket.instances[0];
    act(() => { ws.readyState = 3; ws.onclose?.({ code: 1006, reason: '' }); });
    if (change === 'unmount') unmount();
    else if (change === 'new token') rerender({ token: 'new-access' });
    else await act(async () => { await result.current.handleSuggestedPrompt('Show projects'); });
    await act(async () => resolve(new Response('{}', { status: 401 })));
    expect(onAccessExpired).not.toHaveBeenCalled();
  });
  it('aborts a stalled receipt check without expiring access', async () => {
    vi.useFakeTimers();
    try {
      const fetchMock = vi.fn().mockReturnValue(new Promise(() => {}));
      vi.stubGlobal('fetch', fetchMock);
      const onAccessExpired = vi.fn();
      const { unmount } = renderHook(() => useChat({ fullPage: true, accessToken: 'signed-access', onAccessExpired }));
      act(() => FakeWebSocket.instances[0].onclose?.({ code: 1006, reason: '' }));
      act(() => vi.advanceTimersByTime(5000));
      expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
      expect(onAccessExpired).not.toHaveBeenCalled();
      unmount();
    } finally { vi.useRealTimers(); }
  });
  it('sends the receipt before context and message without putting it in the URL', async () => {
    const { result } = renderHook(() => useChat({ fullPage: true, accessToken: 'signed-access' }));
    await act(async () => { await result.current.handleSuggestedPrompt('Show projects'); });
    const ws = FakeWebSocket.instances[0];
    act(() => ws.simulateOpen());
    expect(ws.url).not.toContain('signed-access');
    expect(ws.sent.map(frame => JSON.parse(frame).type)).toEqual(['access', 'context', 'message']);
    expect(JSON.parse(ws.sent[0])).toEqual({ type: 'access', token: 'signed-access' });
    expect(window.location.search).toBe('?theme=dark');
  });
  it('accepts only allowlisted portfolio card kinds and re-gates expired access', () => {
    const onAccessExpired = vi.fn();
    const { result } = renderHook(() => useChat({ fullPage: true, accessToken: 'signed-access', onAccessExpired }));
    const ws = FakeWebSocket.instances[0];
    act(() => {
      ws.simulateOpen();
      ws.simulateMessage({ type: 'portfolio_card', kind: 'calendar_availability', data: { status: 'unavailable' } });
      ws.simulateMessage({ type: 'portfolio_card', kind: 'arbitrary_html', data: { html: '<script>' } });
    });
    expect(result.current.portfolioCards).toHaveLength(1);
    act(() => ws.onclose?.({ code: 1008, reason: 'Agent access expired' }));
    expect(onAccessExpired).toHaveBeenCalledOnce();
  });
});
