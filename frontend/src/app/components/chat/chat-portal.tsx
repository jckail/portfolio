import React from 'react';
import { createPortal } from 'react-dom';

import Chat from './chat';
import { useChat } from './hooks/useChat';

const ChatPortal: React.FC = () => {
  // Single owner of all chat state (messages, WebSocket, URL sync).
  // Chat itself is purely presentational.
  const chat = useChat();

  // Create a portal that mounts the Chat component directly to the body
  return createPortal(<Chat {...chat} />, document.body);
};

export default ChatPortal;
