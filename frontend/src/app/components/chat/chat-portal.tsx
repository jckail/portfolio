import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { getJson, endpoints } from '../../../shared/utils/api';
import { setChatAvailable } from '../../../shared/utils/chat-availability';
import { getQueryParam, setQueryParam } from '../../../shared/utils/url-params';
import { OPEN_AGENT_EVENT } from '../../../shared/utils/agent-link';
import { ChatButton } from './components/ChatButton';

const AgentDrawer = lazy(() => import('./agent-drawer'));
export default function ChatPortal() {
  const [available, setAvailable] = useState(true);
  const [open, setOpen] = useState(() => getQueryParam('ai_chat') === 'open');
  const [loaded, setLoaded] = useState(open);
  const launcher = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    getJson<{ available?: boolean }>(endpoints.chatStatus).then(data => {
      if (!active) return;
      const enabled = data.available !== false;
      setAvailable(enabled); setChatAvailable(enabled);
      if (!enabled) { setOpen(false); setQueryParam('ai_chat', null, { replace: true }); }
    }).catch(() => { /* Preserve entry point during temporary failures. */ });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const show = () => { setLoaded(true); setOpen(true); setQueryParam('ai_chat', 'open'); };
    const change = () => { const visible = getQueryParam('ai_chat') === 'open'; if (visible) setLoaded(true); setOpen(visible); };
    window.addEventListener(OPEN_AGENT_EVENT, show); window.addEventListener('popstate', change);
    return () => { window.removeEventListener(OPEN_AGENT_EVENT, show); window.removeEventListener('popstate', change); };
  }, []);
  const close = () => {
    setOpen(false); setQueryParam('ai_chat', null);
    requestAnimationFrame(() => launcher.current?.querySelector('button')?.focus());
  };
  if (!available) return null;
  return createPortal(<>
    <div ref={launcher}>{!open && <ChatButton onClick={() => {
      setLoaded(true); setOpen(true); setQueryParam('ai_chat', 'open');
    }} onIntent={() => { void import('./agent-drawer'); }} />}</div>
    {loaded && <Suspense fallback={open ? <div role="status">Opening your conversation…</div> : null}>
      <AgentDrawer open={open} onClose={close} />
    </Suspense>}
  </>, document.body);
}
