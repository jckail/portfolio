import React from 'react';
import { Dialog, DialogContent, useMediaQuery, useTheme } from '@mui/material';

import { AgentConversation } from '../../agent/agent-conversation';
import { useThemeStore } from '../../../shared/stores/theme-store';

export default function AgentDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const theme = useThemeStore(state => state.theme);
  return <Dialog open={open} onClose={onClose} keepMounted fullScreen={mobile} maxWidth={false}
    aria-labelledby="agent-drawer-title" hideBackdrop={!mobile} disableScrollLock disableRestoreFocus
    PaperProps={{ className: 'agent-drawer', sx: {
      position: mobile ? 'relative' : 'fixed', right: mobile ? 'auto' : 16, bottom: mobile ? 'auto' : 16,
      width: mobile ? '100%' : 'min(560px, calc(100vw - 32px))', margin: 0,
      height: mobile ? '100dvh' : 'min(850px, calc(100dvh - 32px))', maxHeight: '100dvh',
      background: 'var(--background-color)', color: 'var(--text-color)', border: '1px solid var(--primary-border)',
      borderRadius: mobile ? 0 : '20px',
    } }}>
    <div className="agent-drawer-header"><h2 id="agent-drawer-title">Chat with my Agent</h2>
      <a href={`/agent?theme=${theme}`}>Full page</a>
      <button type="button" onClick={onClose} aria-label="Close Agent chat">×</button></div>
    <DialogContent sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '12px' }}>
      <AgentConversation />
    </DialogContent>
  </Dialog>;
}
