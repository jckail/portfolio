import React, { useEffect } from 'react';
import { Dialog, DialogContent, useTheme, useMediaQuery } from '@mui/material';
import { useChat } from './hooks/useChat';
import { ChatButton } from './components/ChatButton';
import { ChatHeader } from './components/ChatHeader';
import { ChatMessages } from './components/ChatMessages';
import { ChatInput } from './components/ChatInput';
import { trackChatOpen } from '../../../shared/utils/analytics';

interface ChatProps {
  externalOpen?: boolean;
  externalSetOpen?: (open: boolean) => void;
}

const Chat: React.FC<ChatProps> = ({ externalOpen, externalSetOpen }) => {
  const {
    open: internalOpen,
    setOpen: internalSetOpen,
    message,
    setMessage,
    messages,
    isLoading,
    handleSendMessage,
    initializeChat
  } = useChat();

  // Use external state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalSetOpen || internalSetOpen;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Initialize chat when component mounts if it should be open
  useEffect(() => {
    if (open) {
      initializeChat();
    }
  }, [open, initializeChat]);

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
    <div style={{ position: 'fixed', zIndex: 9999, width: '100%', height: '100%' }}>
      {!open && <ChatButton onClick={handleClickOpen} />}

      <Dialog
        open={open}
        onClose={(_, reason) => {
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            handleClose();
          }
        }}
        maxWidth={false}
        fullScreen={isMobile}
        disableScrollLock
        hideBackdrop={!isMobile}
        PaperProps={{
          sx: {
            width: isMobile ? '100%' : '500px',
            height: isMobile ? '100%' : '100vh',
            maxHeight: isMobile ? '100%' : '100vh',
            borderRadius: isMobile ? 0 : 5,
            margin: isMobile ? 0 : '1vh 0 15vh 0',
            display: 'flex',
            flexDirection: 'column',
            position: isMobile ? 'relative' : 'fixed',
            left: isMobile ? 'auto' : 0,
            top: isMobile ? 'auto' : 0,
            bgcolor: 'var(--surface-color)',
            color: 'var(--text-color)',
            backdropFilter: 'blur(30px)',
            background: isMobile ? 'var(--solid-color)':'var(--surface-color)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            overflowY: 'hidden'
          }
        }}
        sx={{
          position: 'fixed',
          '& .MuiDialog-container': {
            position: 'fixed',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
          },
          '& .MuiBackdrop-root': {
            position: 'fixed'
          }
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
            p: '16px !important'
          }}
        >
          <ChatMessages 
            messages={messages}
            isLoading={isLoading}
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
        `}
      </style>
    </div>
  );
};

export default Chat;
