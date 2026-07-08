import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import Chat from './chat';
import { useChat } from './hooks/useChat';

const ChatPortal: React.FC = () => {
  // Single owner of all chat state (messages, WebSocket, URL sync).
  // Chat itself is purely presentational.
  const chat = useChat();

  // Hide the assistant entirely when the backend reports it unavailable
  // (e.g. no Anthropic API key configured) rather than letting visitors
  // discover the failure through unanswered messages.
  const [available, setAvailable] = useState(true);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/chat/status')
      .then(response => (response.ok ? response.json() : null))
      .then((data: { available?: boolean } | null) => {
        if (!cancelled && data && data.available === false) {
          setAvailable(false);
        }
      })
      .catch(() => {
        // Network hiccup: keep the button; the chat has its own error handling
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!available) return null;

  // Create a portal that mounts the Chat component directly to the body
  return createPortal(<Chat {...chat} />, document.body);
};

export default ChatPortal;
