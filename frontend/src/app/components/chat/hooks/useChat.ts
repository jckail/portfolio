import { useState, useRef, useEffect } from 'react';
import { Message } from '../../../../types/chat';
import { trackChatMessage, getSessionId } from '../../../../shared/utils/analytics';

export const useChat = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { type: 'agent', text: 'Welcome! \n I\'m Jordan\'s AI assistant, ask me a question: \n• Explain Jordan\'s professional experience at Meta, Deloitte, or other companies? \n• Explain Jordan\'s github projects?\n • What are Jordan\'s top skills?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const [initialContextSent, setInitialContextSent] = useState(false);
  const clientId = useRef(Date.now().toString());

  // Update URL when modal state changes
  useEffect(() => {
    if (open) {
      window.history.pushState({modal: 'ai_chat'}, '', '/ai_chat');
    } else {
      window.history.pushState({modal: null}, '', '/');
    }
  }, [open]);

  // Check URL on mount to set initial modal state
  useEffect(() => {
    if (window.location.pathname === '/ai_chat') {
      setOpen(true);
    }
  }, []);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      setOpen(window.location.pathname === '/ai_chat');
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

  useEffect(() => {
    if (open && !webSocket) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/${clientId.current}`;
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket Connected');
        if (!initialContextSent) {
          const pageContext = getPageContext();
          ws.send(JSON.stringify({
            type: 'context',
            content: pageContext
          }));
          setInitialContextSent(true);
        }
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
      };

      ws.onclose = () => {
        console.log('WebSocket Disconnected');
        setWebSocket(null);
        setInitialContextSent(false);
      };

      setWebSocket(ws);
    }

    return () => {
      if (webSocket) {
        webSocket.close();
      }
    };
  }, [open, initialContextSent]);

  const handleSendMessage = async () => {
    if (message.trim() && webSocket && webSocket.readyState === WebSocket.OPEN) {
      // Track sent message
      await trackChatMessage('sent', message.trim().length);
      
      setMessages(prev => [...prev, { type: 'user', text: message }]);
      setIsLoading(true);
      
      webSocket.send(JSON.stringify({
        type: 'message',
        content: message,
        ga_session_id: getSessionId()
      }));
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
