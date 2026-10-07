import React from 'react';

import './ChatButton.css';

interface ChatButtonProps {
  onClick: (e: React.MouseEvent) => void;
  /** Fired on hover/focus so the launcher can start fetching the panel early. */
  onIntent?: () => void;
}

// Plain CSS rather than MUI: this button renders on first paint, and pulling
// MUI + Emotion in for one circle would drag the whole chat bundle onto the
// critical path. The panel behind it is lazy-loaded by ChatPortal.
export const ChatButton: React.FC<ChatButtonProps> = ({ onClick, onIntent }) => (
  <div className="chat-fab-dock">
    <button
      type="button"
      className="chat-fab"
      aria-label="Chat with my Agent"
      aria-haspopup="dialog"
      onClick={onClick}
      onPointerEnter={onIntent}
      onFocus={onIntent}
    >
      <span aria-hidden="true">🤖</span>
      <span className="chat-fab-label" aria-hidden="true">
        Chat with my Agent
      </span>
    </button>
  </div>
);
