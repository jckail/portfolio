import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';

import { getJson, endpoints } from '../../../shared/utils/api';
import { trackChatOpen } from '../../../shared/utils/analytics';
import { setChatAvailable } from '../../../shared/utils/chat-availability';
import { getQueryParam, setQueryParam } from '../../../shared/utils/url-params';
import { runWhenIdle } from '../../utils/run-when-idle';
import { ChatButton } from './components/ChatButton';

const importPanel = () => import('./chat-panel');
const ChatPanel = lazy(importPanel);

/** Phones: the panel (MUI + chat state) is ~56KB the visitor may never open. */
const SMALL_VIEWPORT_QUERY = '(max-width: 767px)';

/**
 * Skip speculative downloads for visitors on data-saver or 2G connections and
 * on small viewports. Clicking the launcher (or touching/focusing it, via
 * onIntent) still loads the panel on demand.
 */
export function shouldPrefetchOnIdle(): boolean {
  if (typeof window.matchMedia === 'function' && window.matchMedia(SMALL_VIEWPORT_QUERY).matches) {
    return false;
  }
  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  if (!connection) return true;
  if (connection.saveData) return false;
  return !/(^|-)2g$/.test(connection.effectiveType ?? '');
}

/**
 * Chat entry point. Renders only the lightweight launcher button on first
 * paint; the panel (MUI, chat state, WebSocket) is fetched the first time it
 * is needed: a click on the button, an `?ai_chat=open` deep link or command,
 * or the browser going idle after load.
 */
const ChatPortal: React.FC = () => {
  const [panelWanted, setPanelWanted] = useState(() => getQueryParam('ai_chat') === 'open');

  // Hide the assistant entirely when the backend reports it unavailable
  // (e.g. no Anthropic API key configured) rather than letting visitors
  // discover the failure through unanswered messages.
  const [available, setAvailable] = useState(true);
  useEffect(() => {
    let cancelled = false;
    getJson<{ available?: boolean }>(endpoints.chatStatus)
      .then(data => {
        if (!cancelled && data.available === false) {
          setAvailable(false);
          // Lets the hero link, palette command and `?` shortcut hide too,
          // and drops a deep link that would otherwise open nothing.
          setChatAvailable(false);
          if (getQueryParam('ai_chat') === 'open') {
            setQueryParam('ai_chat', null, { replace: true });
          }
        }
      })
      .catch(() => {
        // Network hiccup: keep the button; the chat has its own error handling
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keyboard shortcuts and the command palette open the chat by setting
  // ?ai_chat=open and dispatching popstate. Until the panel (and its own URL
  // listener) has loaded, this is the only thing listening for that.
  useEffect(() => {
    if (panelWanted) return;
    const onUrlChange = () => {
      if (getQueryParam('ai_chat') === 'open') setPanelWanted(true);
    };
    window.addEventListener('popstate', onUrlChange);
    return () => window.removeEventListener('popstate', onUrlChange);
  }, [panelWanted]);

  // Warm the panel once the page has settled so the first click is instant.
  useEffect(() => {
    if (panelWanted || !shouldPrefetchOnIdle()) return;
    return runWhenIdle(() => setPanelWanted(true), { delayMs: 4000 });
  }, [panelWanted]);

  const prefetch = useCallback(() => {
    importPanel().catch(() => {
      // Retried by the lazy boundary when the panel is actually needed.
    });
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    trackChatOpen().catch(() => {});
    // useChat reads its initial open state from the URL, so the panel mounts
    // already open: one click, no second render pass to open it.
    setQueryParam('ai_chat', 'open');
    setPanelWanted(true);
  }, []);

  if (!available) return null;

  const launcher = <ChatButton onClick={handleClick} onIntent={prefetch} />;

  if (!panelWanted) {
    return createPortal(launcher, document.body);
  }

  // While the chunk downloads, keep showing the same button so nothing moves.
  return (
    <Suspense fallback={createPortal(launcher, document.body)}>
      <ChatPanel />
    </Suspense>
  );
};

export default ChatPortal;
