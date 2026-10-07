import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { useThemeStore } from '../../../shared/stores/theme-store';
import { getJson, endpoints } from '../../../shared/utils/api';
import { setChatAvailable } from '../../../shared/utils/chat-availability';
import { getQueryParam, setQueryParam } from '../../../shared/utils/url-params';
import { openAgent } from '../../../shared/utils/agent-link';
import './components/ChatButton.css';

/** Lightweight entry point; the dedicated route owns the gated socket. */
const ChatPortal: React.FC = () => {
  const [available, setAvailable] = useState(true);
  const theme = useThemeStore(state => state.theme);
  useEffect(() => {
    let active = true;
    getJson<{ available?: boolean }>(endpoints.chatStatus).then(data => {
      if (!active) return;
      const enabled = data.available !== false;
      setAvailable(enabled); setChatAvailable(enabled);
      if (!enabled && getQueryParam('ai_chat') === 'open') setQueryParam('ai_chat', null, { replace: true });
    }).catch(() => { /* Keep the route reachable during a temporary status failure. */ });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!available) return;
    const redirect = () => { if (getQueryParam('ai_chat') === 'open') openAgent(); };
    redirect();
    window.addEventListener('popstate', redirect);
    return () => window.removeEventListener('popstate', redirect);
  }, [available]);
  if (!available) return null;
  return createPortal(<div className="chat-fab-dock"><a className="chat-fab"
    href={`/agent?theme=${theme}`} aria-label="Chat with AI">
    <span aria-hidden="true">🤖</span><span className="chat-fab-label" aria-hidden="true">Meet my assistant</span>
  </a></div>, document.body);
};
export default ChatPortal;
