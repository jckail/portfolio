import React from 'react';
import { createPortal } from 'react-dom';

import Chat from './chat';
import { useChat } from './hooks/useChat';

/**
 * The full assistant: chat state, WebSocket and the MUI dialog.
 *
 * Only ever reached through ChatPortal's lazy boundary, so MUI + Emotion stay
 * out of the first-paint bundle.
 */
const ChatPanel: React.FC = () => {
  // Single owner of all chat state (messages, WebSocket, URL sync).
  // Chat itself is purely presentational.
  const chat = useChat();

  // Create a portal that mounts the Chat component directly to the body
  return createPortal(<Chat {...chat} />, document.body);
};

export default ChatPanel;
