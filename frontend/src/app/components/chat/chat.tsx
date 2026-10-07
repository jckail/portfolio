import React, { useRef } from 'react';
import { Dialog, DialogContent, Typography, useTheme, useMediaQuery } from '@mui/material';

import { ChatButton } from './components/ChatButton';
import { ChatHeader } from './components/ChatHeader';
import { ChatMessages } from './components/ChatMessages';
import { ChatInput } from './components/ChatInput';
import { trackChatOpen } from '../../../shared/utils/analytics';

import type { UseChatReturn } from './hooks/useChat';

// All chat state comes from the single useChat() instance in ChatPortal
type ChatProps = UseChatReturn;

const Chat: React.FC<ChatProps> = ({
  open,
  setOpen,
  message,
  setMessage,
  messages,
  isLoading,
  handleSendMessage,
  handleSuggestedPrompt,
  showSuggestions,
  pendingActions,
  confirmAction,
  cancelAction,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const containerRef = useRef<HTMLDivElement>(null);

  // The launcher unmounts while the dialog is open, so MUI has nothing to
  // return focus to. Put it back on the launcher once the dialog has left.
  const focusLauncher = () => containerRef.current?.querySelector('button')?.focus();

  const handleClickOpen = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await trackChatOpen();
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <div
      ref={containerRef}
      style={{ position: 'fixed', zIndex: 9999, width: '100%', height: '100%' }}
    >
      {!open && <ChatButton onClick={handleClickOpen} />}

      <Dialog
        open={open}
        aria-labelledby="portfolio-assistant-title"
        aria-describedby="portfolio-assistant-disclosure"
        onClose={(_, reason) => {
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            handleClose();
          }
        }}
        TransitionProps={{ onExited: focusLauncher }}
        maxWidth={false}
        fullScreen={isMobile}
        disableScrollLock
        hideBackdrop={!isMobile}
        PaperProps={{
          sx: {
            width: isMobile ? '100%' : 'min(520px, calc(100vw - 32px))',
            height: isMobile ? '100dvh' : 'min(760px, calc(100dvh - 32px))',
            maxHeight: isMobile ? '100dvh' : 'calc(100dvh - 32px)',
            borderRadius: isMobile ? 0 : 5,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            position: isMobile ? 'relative' : 'fixed',
            left: isMobile ? 'auto' : 16,
            bottom: isMobile ? 'auto' : 16,
            bgcolor: 'var(--surface-color)',
            color: 'var(--text-color)',
            backdropFilter: 'blur(30px)',
            background: isMobile ? 'var(--solid-color)' : 'var(--surface-color)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            overflowY: 'hidden',
            // Translucent blur surfaces are dropped in forced colors; use system colors
            '@media (forced-colors: active)': {
              backdropFilter: 'none',
              background: 'Canvas',
              color: 'CanvasText',
              border: '1px solid CanvasText',
            },
          },
        }}
        sx={{
          position: 'fixed',
          '& .MuiDialog-container': {
            position: 'fixed',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
          },
          '& .MuiBackdrop-root': {
            position: 'fixed',
          },
        }}
      >
        <ChatHeader onClose={handleClose} isMobile={isMobile} />

        <DialogContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            height: '100%',
            overflow: 'hidden',
            bgcolor: 'var(--background-color)',
            position: 'relative',
            p: '16px !important',
          }}
        >
          <Typography
            variant="caption"
            component="p"
            id="portfolio-assistant-disclosure"
            sx={{ color: 'var(--text-secondary)', textAlign: 'center', mb: 1, flexShrink: 0 }}
          >
            AI answers can be mistaken. Chat messages are stored; avoid confidential or sensitive
            information.
          </Typography>
          <Typography
            variant="caption"
            component="p"
            sx={{ color: 'var(--text-secondary)', textAlign: 'center', mb: 1, flexShrink: 0 }}
          >
            To contact Jordan, review the draft and enter your email in the confirmation card.
            Nothing is sent until you confirm.
          </Typography>

          <ChatMessages
            messages={messages}
            isLoading={isLoading}
            showSuggestions={showSuggestions}
            onSuggestedPrompt={handleSuggestedPrompt}
            pendingActions={pendingActions}
            onConfirmAction={confirmAction}
            onCancelAction={cancelAction}
          />

          <ChatInput
            message={message}
            setMessage={setMessage}
            handleSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </DialogContent>
      </Dialog>

      <style>
        {`
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
          .cursor {
            animation: blink 1s step-end infinite;
            margin-left: 2px;
          }
          @media (prefers-reduced-motion: reduce) {
            .cursor { animation: none; }
            .chat-confirm-card, .chat-confirm-card * { transition: none !important; }
          }
        `}
      </style>
    </div>
  );
};

export default Chat;
