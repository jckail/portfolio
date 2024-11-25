import { useState, useRef, useEffect } from 'react';
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
  const [initialContextSent, setInitialContextSent] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const clientId = useRef(Date.now().toString());
  const wsInitialized = useRef(false);
  const messageQueue = useRef<string[]>([]);

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

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setOpen(params.get('ai_chat') === 'open');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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
      html: clone.innerHTML,
      text: clone.textContent?.trim() || ''
    };

    return JSON.stringify(context);
  };

  const sendQueuedMessages = (ws: WebSocket) => {
    while (messageQueue.current.length > 0) {
      const queuedMessage = messageQueue.current.shift();
      if (queuedMessage) {
        ws.send(JSON.stringify({
          type: 'message',
          content: queuedMessage,
          ga_session_id: getSessionId()
        }));
      }
    }
  };

  const initializeWebSocket = () => {
    if (wsInitialized.current || isConnecting) return;
    
    setIsConnecting(true);
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${clientId.current}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket Connected');
      wsInitialized.current = true;
      setIsConnecting(false);
      if (!initialContextSent) {
        const pageContext = getPageContext();
        ws.send(JSON.stringify({
          type: 'context',
          content: pageContext
        }));
        setInitialContextSent(true);
      }
      // Send any queued messages
      sendQueuedMessages(ws);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        
        if (data.is_chunk) {
          // If there's no existing streaming message, create one
          if (!lastMessage?.isStreaming) {
            return [...newMessages, { type: 'agent', text: data.message, isStreaming: true }];
          }
          
          // Update the existing streaming message
          newMessages[newMessages.length - 1] = {
            ...lastMessage,
            text: lastMessage.text + data.message
          };
        } else {
          // If this is a final message
          if (lastMessage?.isStreaming) {
            // Update the streaming message to its final state
            newMessages[newMessages.length - 1] = {
              type: 'agent',
              text: data.message || lastMessage.text,
              isStreaming: false
            };
            // Track received message
            trackChatMessage('received', (data.message || lastMessage.text).length);
          } else if (data.message) {
            // Add a new complete message
            newMessages.push({ type: 'agent', text: data.message });
            // Track received message
            trackChatMessage('received', data.message.length);
          }
          setIsLoading(false);
        }
        
        return newMessages;
      });
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
      setMessages(prev => [...prev, { 
        type: 'agent', 
        text: 'I apologize, but I encountered an error. Please try again.' 
      }]);
      setIsLoading(false);
      wsInitialized.current = false;
      setIsConnecting(false);
    };

    ws.onclose = () => {
      console.log('WebSocket Disconnected');
      setWebSocket(null);
      setInitialContextSent(false);
      wsInitialized.current = false;
      setIsConnecting(false);
    };

    setWebSocket(ws);
  };

  // Initialize WebSocket when chat is opened
  useEffect(() => {
    if (open && !webSocket && !isConnecting) {
      initializeWebSocket();
    }

    return () => {
      if (webSocket) {
        webSocket.close();
        wsInitialized.current = false;
      }
    };
  }, [open]);

  const handleSendMessage = async () => {
    if (message.trim()) {
      // Add message to UI immediately
      setMessages(prev => [...prev, { type: 'user', text: message }]);
      setIsLoading(true);

      // Track sent message
      await trackChatMessage('sent', message.trim().length);

      // If WebSocket isn't connected, initialize it and queue the message
      if (!webSocket || webSocket.readyState !== WebSocket.OPEN) {
        messageQueue.current.push(message);
        if (!isConnecting) {
          initializeWebSocket();
        }
      } else {
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
    handleSendMessage
  };
};
