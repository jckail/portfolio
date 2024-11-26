import { useState, useRef, useEffect, useCallback } from 'react';
import { Message } from '../../../../types/chat';
import { trackChatMessage, getSessionId } from '../../../../shared/utils/analytics';

export const useChat = () => {
  const [open, setOpen] = useState(() => {
    // Initialize state based on URL parameter
    const params = new URLSearchParams(window.location.search);
    return params.get('ai_chat') === 'open';
  });
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { type: 'agent', text: 'Welcome! \n I\'m Jordan\'s AI assistant, ask me a question: \n• Explain Jordan\'s professional experience at Meta, Deloitte, or other companies? \n• Explain Jordan\'s github projects?\n • What are Jordan\'s top skills?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const clientId = useRef(Date.now().toString());
  const wsInitialized = useRef(false);
  const messageQueue = useRef<string[]>([]);
  const currentStreamingMessage = useRef<string>('');

  // Listen for URL parameter changes
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const shouldBeOpen = params.get('ai_chat') === 'open';
      if (shouldBeOpen !== open) {
        setOpen(shouldBeOpen);
      }
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
  }, [open]);

  const getPageContext = () => {
    const mainContent = document.querySelector('#root') as HTMLElement;
    if (!mainContent) return '';

    const clone = mainContent.cloneNode(true) as HTMLElement;
    const chatDialog = clone.querySelector('[role="dialog"]');
    if (chatDialog) {
      chatDialog.remove();
    }

    const context = {
      html: clone.innerHTML,
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
    if (wsInitialized.current) return;
    
    console.log('Initializing chat and WebSocket connection...');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${clientId.current}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket Connected');
      wsInitialized.current = true;
      setWebSocket(ws);
      
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
      console.log('WebSocket message received:', event.data);
      const data = JSON.parse(event.data);
      
      if (data.is_chunk) {
        // Accumulate streaming chunks
        currentStreamingMessage.current += data.message;
        
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
        // Final message received
        const finalMessage = data.message || currentStreamingMessage.current;
        
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
        
        // Reset streaming state and loading
        currentStreamingMessage.current = '';
        setIsLoading(false);
        
        // Track received message
        trackChatMessage('received', finalMessage.length);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
      setMessages(prev => [...prev, { 
        type: 'agent', 
        text: 'I apologize, but I encountered an error. Please try again.' 
      }]);
      setIsLoading(false);
      wsInitialized.current = false;
    };

    ws.onclose = () => {
      console.log('WebSocket Disconnected');
      setWebSocket(null);
      wsInitialized.current = false;
      setIsLoading(false);
      currentStreamingMessage.current = '';
    };
  }, []);

  // Update URL when modal state changes
  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    
    if (open) {
      currentUrl.searchParams.set('ai_chat', 'open');
    } else {
      currentUrl.searchParams.delete('ai_chat');
    }

    // Remove the hash from the URL object
    const hash = window.location.hash;
    const urlWithoutHash = currentUrl.toString().split('#')[0];
    
    // Construct the final URL with at most one hash
    const finalUrl = hash ? `${urlWithoutHash}${hash}` : urlWithoutHash;
    
    window.history.pushState({}, '', finalUrl);
  }, [open]);

  // Initialize chat when open changes
  useEffect(() => {
    if (open) {
      initializeChat();
    }
  }, [open, initializeChat]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (webSocket) {
        console.log('Cleaning up WebSocket connection...');
        webSocket.close();
        wsInitialized.current = false;
        currentStreamingMessage.current = '';
      }
    };
  }, [webSocket]);

  const handleSendMessage = async () => {
    if (message.trim()) {
      // Add user message to UI immediately
      setMessages(prev => [...prev, { type: 'user', text: message }]);
      
      // Track sent message
      await trackChatMessage('sent', message.trim().length);

      // Ensure WebSocket is initialized
      if (!webSocket || webSocket.readyState !== WebSocket.OPEN) {
        messageQueue.current.push(message);
        initializeChat();
      } else {
        setIsLoading(true);
        // If WebSocket is connected, send immediately
        webSocket.send(JSON.stringify({
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
