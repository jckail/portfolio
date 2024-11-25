import React from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import Chat from './chat';
import { useChat } from './hooks/useChat';

const ChatPortal: React.FC = () => {
  const { open, setOpen } = useChat();
  const location = useLocation();

  // If the URL is /ai_chat, the useChat hook will automatically open the chat
  // due to its internal URL handling logic

  // Create a portal that mounts the Chat component directly to the body
  return createPortal(
    <Chat externalOpen={open} externalSetOpen={setOpen} />,
    document.body
  );
};

export default ChatPortal;
