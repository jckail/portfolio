import { useState, useRef, useEffect, useCallback } from 'react';

import { Message } from '../../../../types/chat';
import { trackChatMessage, getSessionId } from '../../../../shared/utils/analytics';
import { getQueryParam, setQueryParam } from '../../../../shared/utils/url-params';
import {
  executeChatAction,
  type ChatAction,
} from '../../../../shared/utils/chat-actions';
import {
  WELCOME_MESSAGE,
  loadChatMessages,
  saveChatMessages,
} from '../chat-storage';

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

export const useChat = () => {
  const [open, setOpen] = useState(() => getQueryParam('ai_chat') === 'open');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  // Keys the server's per-connection chat state, so it must be unguessable:
  // a timestamp here would let anyone sweep recent values and land on a live
  // visitor's session. Falls back only where randomUUID is unavailable.
  const clientId = useRef(createClientId());
  const wsRef = useRef<WebSocket | null>(null);
  const isMounted = useRef(true);
  const messageQueue = useRef<string[]>([]);
  const currentStreamingMessage = useRef<string>('');
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

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
    const handleUrlChange = () => {
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
  }, []);

  const getPageContext = () => {
    const mainContent = document.querySelector('#root') as HTMLElement;
    if (!mainContent) return '';

    const clone = mainContent.cloneNode(true) as HTMLElement;
    const chatDialog = clone.querySelector('[role="dialog"]');
    if (chatDialog) {
      chatDialog.remove();
    }

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
            ga_session_id: getSessionId(),
          })
        );
      }
    }
  };

  const initializeChat = useCallback(() => {
    const existing = wsRef.current;
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
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMounted.current) {
        ws.close();
        return;
      }

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
      if (!isMounted.current) return;

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
      };
      try {
        data = JSON.parse(event.data);
      } catch {
        console.error('Received malformed chat message:', event.data);
        return;
      }

      // Assistant-requested UI action (navigate / open modal / download)
      if (data.type === 'action' && data.action) {
        const action = data as ChatAction;
        try {
          executeChatAction(action);
        } catch (err) {
          console.error('Failed to execute chat action:', err);
        }
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
      if (!isMounted.current) return;
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

    ws.onclose = () => {
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      if (!isMounted.current) return;
      finalizeStreamingMessage();
      setIsLoading(false);
      currentStreamingMessage.current = '';
    };
  }, [finalizeStreamingMessage]);

  useEffect(() => {
    const isOpenInUrl = getQueryParam('ai_chat') === 'open';
    if (isOpenInUrl === open) return;
    setQueryParam('ai_chat', open ? 'open' : null);
  }, [open]);

  useEffect(() => {
    if (open) {
      initializeChat();
    }
  }, [open, initializeChat]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
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
            ga_session_id: getSessionId(),
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
  };
};

export type UseChatReturn = ReturnType<typeof useChat>;
