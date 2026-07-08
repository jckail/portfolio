import { useState, useRef, useEffect, useCallback } from 'react';

import { Message } from '../../../../types/chat';
import { trackChatMessage, getSessionId } from '../../../../shared/utils/analytics';
import { getQueryParam, setQueryParam } from '../../../../shared/utils/url-params';

export const useChat = () => {
  const [open, setOpen] = useState(() => getQueryParam('ai_chat') === 'open');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { type: 'agent', text: 'Welcome! \n I\'m Jordan\'s AI assistant, ask me a question: \n• Explain Jordan\'s professional experience at Meta, Deloitte, or other companies? \n• Explain Jordan\'s github projects?\n • What are Jordan\'s top skills?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const clientId = useRef(Date.now().toString());
  const wsRef = useRef<WebSocket | null>(null);
  const isMounted = useRef(true);
  const messageQueue = useRef<string[]>([]);
  const currentStreamingMessage = useRef<string>('');

  // Listen for URL parameter changes
  useEffect(() => {
    const handleUrlChange = () => {
      const shouldBeOpen = getQueryParam('ai_chat') === 'open';
      setOpen(prev => (shouldBeOpen !== prev ? shouldBeOpen : prev));
    };

    // Listen for popstate (browser back/forward)
    window.addEventListener('popstate', handleUrlChange);

    // Listen for pushstate/replacestate
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      handleUrlChange();
    };

    history.replaceState = function(...args) {
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
      text: clone.textContent?.trim() || ''
    };

    return JSON.stringify(context);
  };

  const sendQueuedMessages = (ws: WebSocket) => {
    while (messageQueue.current.length > 0) {
      const queuedMessage = messageQueue.current.shift();
      if (queuedMessage) {
        setIsLoading(true);
        ws.send(JSON.stringify({
          type: 'message',
          content: queuedMessage,
          ga_session_id: getSessionId()
        }));
      }
    }
  };

  const initializeChat = useCallback(() => {
    // Reuse an existing socket that is open or still connecting
    const existing = wsRef.current;
    if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
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

      // Send initial context immediately after connection
      const pageContext = getPageContext();
      ws.send(JSON.stringify({
        type: 'context',
        content: pageContext
      }));

      // Send any queued messages
      sendQueuedMessages(ws);
    };

    ws.onmessage = (event) => {
      if (!isMounted.current) return;

      let data: { message?: string; is_chunk?: boolean };
      try {
        data = JSON.parse(event.data);
      } catch {
        console.error('Received malformed chat message:', event.data);
        return;
      }

      if (data.is_chunk) {
        // Accumulate streaming chunks
        currentStreamingMessage.current += data.message ?? '';

        // Update messages with current accumulated chunk
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];

          if (lastMessage?.isStreaming) {
            // Update existing streaming message
            newMessages[newMessages.length - 1] = {
              type: 'agent',
              text: currentStreamingMessage.current,
              isStreaming: true
            };
          } else {
            // Create new streaming message
            newMessages.push({
              type: 'agent',
              text: currentStreamingMessage.current,
              isStreaming: true
            });
          }

          return newMessages;
        });
      } else {
        // Final frame received. The server sends an empty message when the
        // client already has the full streamed text.
        const finalMessage = data.message || currentStreamingMessage.current;

        if (finalMessage) {
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];

            if (lastMessage?.isStreaming) {
              // Update streaming message to final state
              newMessages[newMessages.length - 1] = {
                type: 'agent',
                text: finalMessage,
                isStreaming: false
              };
            } else {
              // Add new complete message
              newMessages.push({
                type: 'agent',
                text: finalMessage
              });
            }

            return newMessages;
          });
        }

        // Reset streaming state and loading
        currentStreamingMessage.current = '';
        setIsLoading(false);

        // Track received message
        if (finalMessage) {
          trackChatMessage('received', finalMessage.length);
        }
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
      if (!isMounted.current) return;
      setMessages(prev => [...prev, { 
        type: 'agent', 
        text: 'I apologize, but I encountered an error. Please try again.' 
      }]);
      setIsLoading(false);
    };

    ws.onclose = () => {
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      if (!isMounted.current) return;
      setIsLoading(false);
      currentStreamingMessage.current = '';
    };
  }, []);

  // Update URL when modal state changes
  useEffect(() => {
    const isOpenInUrl = getQueryParam('ai_chat') === 'open';
    if (isOpenInUrl === open) return;
    setQueryParam('ai_chat', open ? 'open' : null);
  }, [open]);

  // Initialize chat when open changes
  useEffect(() => {
    if (open) {
      initializeChat();
    }
  }, [open, initializeChat]);

  // Close the WebSocket only on unmount
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

  const handleSendMessage = async () => {
    if (message.trim()) {
      // Add user message to UI immediately
      setMessages(prev => [...prev, { type: 'user', text: message }]);
      
      // Track sent message
      await trackChatMessage('sent', message.trim().length);

      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        // Queue the message; it is flushed when the connection opens
        messageQueue.current.push(message);
        setIsLoading(true);
        initializeChat();
      } else {
        setIsLoading(true);
        // If WebSocket is connected, send immediately
        ws.send(JSON.stringify({
          type: 'message',
          content: message,
          ga_session_id: getSessionId()
        }));
      }
      
      setMessage('');
    }
  };

  return {
    open,
    setOpen,
    message,
    setMessage,
    messages,
    isLoading,
    handleSendMessage,
    initializeChat
  };
};

export type UseChatReturn = ReturnType<typeof useChat>;
