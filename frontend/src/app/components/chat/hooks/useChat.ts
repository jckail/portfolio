import { useState, useRef, useEffect } from 'react';
import { Message } from '../../../../types/chat';

export const useChat = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { type: 'agent', text: 'Welcome! I\'m Jordan\'s AI assistant, here to help you explore his expertise in software engineering and data architecture.' },
    { type: 'agent', text: 'Feel free to ask about:\n• Technical projects and implementations\n• Professional experience at Meta, Deloitte, and other companies\n• Full-stack development and cloud architecture expertise\n• Potential collaboration opportunities' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const [initialContextSent, setInitialContextSent] = useState(false);
  const clientId = useRef(Date.now().toString());

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
            } else if (data.message) {
              // Add a new complete message
              newMessages.push({ type: 'agent', text: data.message });
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
      setMessages(prev => [...prev, { type: 'user', text: message }]);
      setIsLoading(true);
      
      webSocket.send(JSON.stringify({
        type: 'message',
        content: message
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
