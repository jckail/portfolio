import { useState, useRef, useEffect, useCallback } from 'react';

import { trackChatMessage } from '../../../../shared/utils/analytics';
import { ApiError, getJson } from '../../../../shared/utils/api';
import { getQueryParam, setQueryParam } from '../../../../shared/utils/url-params';
import {
  executeChatAction,
  type ChatAction,
} from '../../../../shared/utils/chat-actions';
import {
  CONFIRM_TTL_MS,
  isConfirmTool,
  sanitizeArgs,
  validateArgs,
  validateEmail,
} from '../chat-confirm';
import {
  WELCOME_MESSAGE,
  loadChatMessages,
  saveChatMessages,
} from '../chat-storage';

import type { Message, PendingAction, ConfirmArgs } from '../../../../types/chat';

function initialMessages(): Message[] {
  return loadChatMessages() ?? [WELCOME_MESSAGE];
}

/** 128 bits of entropy for the chat session id, with a non-crypto fallback. */
function createClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

const CHAT_SESSION_KEY = 'chat_session_id';

/**
 * ID the backend stores chat turns under (sent as `ga_session_id`, the
 * field name the server expects). It is an independent random
 * per-tab ID with no link to visitor analytics.
 */
export function getChatSessionId(): string {
  try {
    let id = sessionStorage.getItem(CHAT_SESSION_KEY);
    if (!id) {
      id = `chat_${createClientId()}`;
      sessionStorage.setItem(CHAT_SESSION_KEY, id);
    }
    return id;
  } catch {
    return `chat_${createClientId()}`;
  }
}

// Subtrees never sent to the model as page context: the chat itself, the
// cookie banner, and admin-only UI (telemetry shows console output and
// errors). Mark any other element with data-no-chat-context to exclude it.
const CONTEXT_EXCLUDE_SELECTOR = [
  '[role="dialog"]',
  '.MuiDialog-root',
  '.telemetry-banner',
  '.admin-login-overlay',
  '.cookie-banner',
  '[data-no-chat-context]',
].join(', ');

export const useChat = (options: { accessToken?: string; fullPage?: boolean; enabled?: boolean; onAccessExpired?: () => void; onAccessStatus?: (remaining: number) => void; onAccessRequired?: () => void } = {}) => {
  const { accessToken, fullPage = false, enabled = true, onAccessExpired } = options;
  const accessCallbacks = useRef(options);
  accessCallbacks.current = options;
  const [open, setOpen] = useState(() => fullPage || getQueryParam('ai_chat') === 'open');
  const [portfolioCards, setPortfolioCards] = useState<{ kind: string; data: unknown }[]>([]);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  // Confirmation cards for execute-type tools. Held in memory only: never
  // persisted, so an email or phone number cannot outlive the tab.
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  // Keys the server's per-connection chat state, so it must be unguessable:
  // a timestamp here would let anyone sweep recent values and land on a live
  // visitor's session. Falls back only where randomUUID is unavailable.
  const clientId = useRef(createClientId());
  const wsRef = useRef<WebSocket | null>(null);
  const isMounted = useRef(true);
  const accessCheck = useRef<AbortController | null>(null);
  const connectionGeneration = useRef(0);
  const currentAccessToken = useRef(accessToken);
  currentAccessToken.current = accessToken;
  const messageQueue = useRef<string[]>([]);
  const currentStreamingMessage = useRef<string>('');
  const pendingRef = useRef<PendingAction[]>([]);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  pendingRef.current = pendingActions;

  /**
   * Clear the streaming flag on a partially-streamed reply.
   *
   * If the socket drops mid-stream the last message keeps `isStreaming: true`,
   * which leaves the blinking cursor running forever and makes
   * `saveChatMessages` filter the message out of the persisted transcript.
   */
  const finalizeStreamingMessage = useCallback(() => {
    setMessages(prev =>
      prev.map((m, i) =>
        i === prev.length - 1 && m.isStreaming ? { ...m, isStreaming: false } : m
      )
    );
  }, []);

  // Persist completed transcript across reloads within the tab session
  useEffect(() => {
    saveChatMessages(messages);
  }, [messages]);

  // Listen for URL parameter changes
  useEffect(() => {
    if (fullPage) return;
    const handleUrlChange = () => {
      if (fullPage) return;
      const shouldBeOpen = getQueryParam('ai_chat') === 'open';
      setOpen(prev => (shouldBeOpen !== prev ? shouldBeOpen : prev));
    };

    window.addEventListener('popstate', handleUrlChange);

    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      handleUrlChange();
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      handleUrlChange();
    };

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [fullPage]);

  const getPageContext = () => {
    const mainContent = document.querySelector('#root') as HTMLElement;
    if (!mainContent) return '';

    const clone = mainContent.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(CONTEXT_EXCLUDE_SELECTOR).forEach(el => el.remove());

    const context = {
      text: clone.textContent?.trim() || '',
    };

    return JSON.stringify(context);
  };

  const sendQueuedMessages = (ws: WebSocket) => {
    while (messageQueue.current.length > 0) {
      const queuedMessage = messageQueue.current.shift();
      if (queuedMessage) {
        setIsLoading(true);
        ws.send(
          JSON.stringify({
            type: 'message',
            content: queuedMessage,
            ga_session_id: getChatSessionId(),
          })
        );
      }
    }
  };

  const initializeChat = useCallback(() => {
    const existing = wsRef.current;
    if (!enabled) return;
    if (
      existing &&
      (existing.readyState === WebSocket.OPEN ||
        existing.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${clientId.current}`;

    const ws = new WebSocket(wsUrl);
    accessCheck.current?.abort();
    const generation = ++connectionGeneration.current;
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMounted.current || connectionGeneration.current !== generation) {
        ws.close();
        return;
      }

      if (accessToken) ws.send(JSON.stringify({ type: 'access', token: accessToken }));
      const pageContext = getPageContext();
      ws.send(
        JSON.stringify({
          type: 'context',
          content: pageContext,
        })
      );

      // Replay persisted turns so the server keeps conversation context
      // after a page reload. Exclude messages still sitting in the outbound
      // queue — those will be sent as normal `message` frames next and must
      // not be double-counted in history.
      const queued = messageQueue.current;
      let source = messagesRef.current.filter(
        m =>
          !m.isStreaming &&
          !(m.type === 'agent' && m.text === WELCOME_MESSAGE.text)
      );
      if (queued.length > 0) {
        let toDrop = queued.length;
        const kept: typeof source = [];
        for (let i = source.length - 1; i >= 0; i -= 1) {
          if (toDrop > 0 && source[i].type === 'user') {
            toDrop -= 1;
            continue;
          }
          kept.unshift(source[i]);
        }
        source = kept;
      }
      const priorTurns = source.map(m => ({
        role: m.type === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));
      if (priorTurns.some(t => t.role === 'user')) {
        ws.send(
          JSON.stringify({
            type: 'history',
            messages: priorTurns,
          })
        );
      }

      sendQueuedMessages(ws);
    };

    ws.onmessage = event => {
      if (!isMounted.current || connectionGeneration.current !== generation) return;

      let data: {
        type?: string;
        message?: string;
        is_chunk?: boolean;
        action?: string;
        target?: string;
        kind?: string;
        key?: string | null;
        theme?: string;
        draft?: { from_email?: string; subject?: string; message?: string };
        id?: string;
        tool?: string;
        args?: unknown;
        ok?: boolean;
        phone?: string;
        data?: unknown;
        remaining_messages?: number;
      };
      try {
        data = JSON.parse(event.data);
      } catch {
        console.error('Received malformed chat message:', event.data);
        return;
      }

      if (data.type === 'access_status') {
        if (Number.isInteger(data.remaining_messages) && data.remaining_messages! >= 0 && data.remaining_messages! <= 2)
          accessCallbacks.current.onAccessStatus?.(data.remaining_messages!);
        return;
      }
      if (data.type === 'access_required') {
        accessCallbacks.current.onAccessRequired?.();
        finalizeStreamingMessage();
        currentStreamingMessage.current = '';
        setIsLoading(false);
        return;
      }

      // Assistant-requested UI action (navigate / open modal / download)
      if (data.type === 'portfolio_card' && ['recruiter_brief', 'project', 'role_match', 'contact_options', 'calendar_availability'].includes(data.kind ?? '')) {
        setPortfolioCards(prev => [...prev.slice(-9), { kind: data.kind!, data: data.data }]);
        return;
      }
      if (data.type === 'action' && data.action) {
        const action = data as ChatAction;
        try {
          executeChatAction(action);
        } catch (err) {
          console.error('Failed to execute chat action:', err);
        }
        return;
      }

      // An execute-type tool is waiting for the visitor. Nothing is sent
      // until they press Confirm on the card.
      if (data.type === 'confirm_action') {
        const id = typeof data.id === 'string' ? data.id : '';
        if (!id || !isConfirmTool(data.tool)) return;
        const tool = data.tool;
        setPendingActions(prev => {
          if (prev.some(p => p.id === id)) return prev; // duplicate frame
          return [
            ...prev.slice(-4),
            {
              id,
              tool,
              args: sanitizeArgs(data.args),
              status: 'pending',
              expiresAt: Date.now() + CONFIRM_TTL_MS,
            },
          ];
        });
        return;
      }

      if (data.type === 'action_result') {
        const id = typeof data.id === 'string' ? data.id : '';
        if (!id) return;
        const ok = data.ok === true;
        const text =
          typeof data.message === 'string' && data.message
            ? data.message.slice(0, 500)
            : ok
              ? 'Done.'
              : 'That did not go through. Please try again.';
        const phone = ok && typeof data.phone === 'string' ? data.phone.slice(0, 40) : undefined;
        setPendingActions(prev =>
          prev.map(p =>
            p.id === id && (p.status === 'pending' || p.status === 'submitting')
              ? { ...p, status: ok ? 'done' : 'failed', resultMessage: text, phone }
              : p
          )
        );
        return;
      }

      if (data.is_chunk) {
        currentStreamingMessage.current += data.message ?? '';

        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];

          if (lastMessage?.isStreaming) {
            newMessages[newMessages.length - 1] = {
              type: 'agent',
              text: currentStreamingMessage.current,
              isStreaming: true,
            };
          } else {
            newMessages.push({
              type: 'agent',
              text: currentStreamingMessage.current,
              isStreaming: true,
            });
          }

          return newMessages;
        });
      } else {
        const finalMessage = data.message || currentStreamingMessage.current;

        if (finalMessage) {
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];

            if (lastMessage?.isStreaming) {
              newMessages[newMessages.length - 1] = {
                type: 'agent',
                text: finalMessage,
                isStreaming: false,
              };
            } else {
              newMessages.push({
                type: 'agent',
                text: finalMessage,
              });
            }

            return newMessages;
          });
        }

        currentStreamingMessage.current = '';
        setIsLoading(false);

        if (finalMessage) {
          trackChatMessage('received', finalMessage.length);
        }
      }
    };

    ws.onerror = error => {
      console.error('WebSocket Error:', error);
      if (!isMounted.current || connectionGeneration.current !== generation) return;
      finalizeStreamingMessage();
      setMessages(prev => [
        ...prev,
        {
          type: 'agent',
          text: 'I apologize, but I encountered an error. Please try again.',
        },
      ]);
      setIsLoading(false);
    };

    ws.onclose = event => {
      if (!isMounted.current || connectionGeneration.current !== generation) return;
      if (event?.code === 1008 && accessToken && /access/i.test(event.reason)) onAccessExpired?.();
      // Proxies can drop the policy close frame. Only an authoritative HTTP 401
      // should re-gate access; an outage must leave a valid receipt retryable.
      if (event?.code === 1006 && accessToken && onAccessExpired) {
        const controller = new AbortController();
        accessCheck.current?.abort();
        accessCheck.current = controller;
        const timer = setTimeout(() => controller.abort(), 5000);
        void getJson('/api/agent/access', {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        }).catch(error => {
          if (error instanceof ApiError && error.status === 401
            && !controller.signal.aborted && isMounted.current
            && connectionGeneration.current === generation
            && currentAccessToken.current === accessToken) onAccessExpired();
        }).finally(() => {
          clearTimeout(timer);
          if (accessCheck.current === controller) accessCheck.current = null;
        });
      }
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      if (!isMounted.current) return;
      finalizeStreamingMessage();
      setIsLoading(false);
      currentStreamingMessage.current = '';
      // Pending ids are bound to this connection, so they die with it.
      setPendingActions(prev =>
        prev.map(p =>
          p.status === 'pending'
            ? { ...p, status: 'expired' }
            : p.status === 'submitting'
              ? { ...p, status: 'failed', resultMessage: 'The connection closed before this finished. Please try again.' }
              : p
        )
      );
    };
  }, [finalizeStreamingMessage, accessToken, onAccessExpired, enabled]);

  // Upgrade the existing conversation without losing transcript or draft.
  useEffect(() => {
    connectionGeneration.current += 1;
    accessCheck.current?.abort();
    const previous = wsRef.current;
    wsRef.current = null;
    previous?.close();
    // A closing connection may still occupy its server slot when the upgraded
    // socket arrives. New credentials get a new transport ID; history replays
    // separately and the durable trial quota remains bound to its receipt.
    if (previous) clientId.current = createClientId();
    setPendingActions(prev => prev.map(p => p.status === 'pending' || p.status === 'submitting'
      ? { ...p, status: 'expired', resultMessage: 'Please request a new draft after introducing yourself.' } : p));
  }, [accessToken]);

  // Expire cards locally when the server's 10 minute window passes.
  useEffect(() => {
    const live = pendingActions.filter(p => p.status === 'pending');
    if (live.length === 0) return;
    const next = Math.min(...live.map(p => p.expiresAt));
    const timer = setTimeout(() => {
      const now = Date.now();
      setPendingActions(prev =>
        prev.map(p => (p.status === 'pending' && p.expiresAt <= now ? { ...p, status: 'expired' } : p))
      );
    }, Math.max(0, next - Date.now()) + 50);
    return () => clearTimeout(timer);
  }, [pendingActions]);

  useEffect(() => {
    if (fullPage) return;
    const isOpenInUrl = getQueryParam('ai_chat') === 'open';
    if (isOpenInUrl === open) return;
    setQueryParam('ai_chat', open ? 'open' : null);
  }, [open, fullPage]);

  useEffect(() => {
    if (open) {
      initializeChat();
    }
  }, [open, initializeChat]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      accessCheck.current?.abort();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      currentStreamingMessage.current = '';
    };
  }, []);

  const sendUserText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      setMessages(prev => [...prev, { type: 'user', text: trimmed }]);
      await trackChatMessage('sent', trimmed.length);

      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        messageQueue.current.push(trimmed);
        setIsLoading(true);
        initializeChat();
      } else {
        setIsLoading(true);
        ws.send(
          JSON.stringify({
            type: 'message',
            content: trimmed,
            ga_session_id: getChatSessionId(),
          })
        );
      }
    },
    [initializeChat]
  );

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    const toSend = message;
    setMessage('');
    await sendUserText(toSend);
  };

  const handleSuggestedPrompt = async (prompt: string) => {
    setMessage('');
    await sendUserText(prompt);
  };

  /** Send the visitor's confirmation. Returns field errors, or null when sent. */
  const confirmAction = useCallback(
    (id: string, email: string, args: ConfirmArgs, company = ''): Record<string, string> | null => {
      const card = pendingActions.find(p => p.id === id);
      if (!card || card.status !== 'pending') return {};
      const errors = validateArgs(card.tool, args);
      if (card.tool === 'contact_jordan' || card.tool === 'request_meeting') {
        if (!company.trim()) errors.company = 'Add your company or organization.';
        else if (company.length > 150 || /[\r\n]/.test(company)) errors.company = 'Use one line, up to 150 characters.';
      }
      const emailError = validateEmail(email);
      if (emailError) errors.email = emailError;
      if (Object.keys(errors).length > 0) return errors;

      if (Date.now() >= card.expiresAt) {
        setPendingActions(prev => prev.map(p => (p.id === id ? { ...p, status: 'expired' } : p)));
        return {};
      }
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        setPendingActions(prev =>
          prev.map(p =>
            p.id === id
              ? { ...p, status: 'expired', resultMessage: 'The connection was lost. Ask the assistant again.' }
              : p
          )
        );
        return {};
      }
      const frame: Record<string, unknown> = { type: 'confirm_action', id, email: email.trim(), company: company.trim() };
      if (card.tool !== 'request_phone') frame.args = args;
      ws.send(JSON.stringify(frame));
      setPendingActions(prev => prev.map(p => (p.id === id ? { ...p, status: 'submitting' } : p)));
      return null;
    },
    [pendingActions]
  );

  const cancelAction = useCallback((id: string) => {
    const card = pendingRef.current.find(p => p.id === id);
    if (!card || card.status !== 'pending') return;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'cancel_action', id }));
    }
    setPendingActions(prev => prev.map(p => (p.id === id ? { ...p, status: 'cancelled' } : p)));
  }, []);

  const hasUserMessage = messages.some(m => m.type === 'user');
  const showSuggestions = !hasUserMessage && !isLoading;

  return {
    open,
    setOpen,
    message,
    setMessage,
    messages,
    isLoading,
    handleSendMessage,
    handleSuggestedPrompt,
    showSuggestions,
    initializeChat,
    pendingActions,
    portfolioCards,
    confirmAction,
    cancelAction,
  };
};

export type UseChatReturn = ReturnType<typeof useChat>;
