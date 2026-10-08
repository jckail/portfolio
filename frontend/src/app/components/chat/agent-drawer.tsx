import React, { useState, useSyncExternalStore } from 'react';
import { Dialog, DialogContent, useMediaQuery, useTheme } from '@mui/material';

import { AgentConversation } from '../../agent/agent-conversation';
import { useThemeStore } from '../../../shared/stores/theme-store';
import { openDialogCount, subscribeDialogs } from '../../../shared/hooks/dialog-stack';

export default function AgentDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const theme = useThemeStore(state => state.theme);
  // Desktop is a side panel, not a second page modal. A body-level Dialog
  // otherwise covers the viewport, hides the rest of the page, and swallows
  // clicks on Contact. Mounting into this holder keeps that aria-hidden
  // local to the panel.
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const sidePanel = !mobile;
  // Contact owns focus above this pane. Two document-level focus traps
  // otherwise repeatedly steal focus from each other on narrow screens.
  const pageDialogOpen = useSyncExternalStore(subscribeDialogs, openDialogCount) > 0;
  return <div ref={setContainer}>{container && <Dialog open={open} onClose={onClose} keepMounted fullScreen={mobile} maxWidth={false}
    container={sidePanel ? container : undefined}
    aria-labelledby="agent-drawer-title" hideBackdrop={sidePanel} disableScrollLock disableRestoreFocus
    disableEnforceFocus={sidePanel || pageDialogOpen}
    disableAutoFocus={pageDialogOpen}
    sx={sidePanel ? { pointerEvents: 'none', '& .MuiDialog-container': { pointerEvents: 'none' } } : undefined}
    PaperProps={{ className: 'agent-drawer', sx: {
      pointerEvents: 'auto',
      position: mobile ? 'relative' : 'fixed', right: mobile ? 'auto' : 16, bottom: mobile ? 'auto' : 16,
      width: mobile ? '100%' : 'min(560px, calc(100vw - 32px))', margin: 0,
      height: mobile ? '100dvh' : 'min(850px, calc(100dvh - 32px))', maxHeight: '100dvh',
      background: 'var(--surface-opaque)', color: 'var(--text-color)', border: '1px solid var(--primary-border)',
      borderRadius: mobile ? 0 : '20px',
      '@media (forced-colors: active)': { background: 'Canvas', color: 'CanvasText', borderColor: 'CanvasText' },
    } }}>
    <div className="agent-drawer-header"><h2 id="agent-drawer-title">Chat with my Agent</h2>
      <a href={`/agent?theme=${theme}`}>Full page</a>
      <button type="button" onClick={onClose} aria-label="Close Agent chat">×</button></div>
    <DialogContent sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '12px' }}>
      <AgentConversation embedded />
    </DialogContent>
  </Dialog>}</div>;
}
