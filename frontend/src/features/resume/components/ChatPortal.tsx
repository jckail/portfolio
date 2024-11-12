import React from 'react';
import { createPortal } from 'react-dom';
import Chat from './Chat';

const ChatPortal: React.FC = () => {
  // Create a portal that mounts the Chat component directly to the body
  return createPortal(
    <Chat />,
    document.body
  );
};

export default ChatPortal;
