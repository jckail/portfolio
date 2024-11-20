import React from 'react';
import { Dialog, DialogContent, useTheme, useMediaQuery } from '@mui/material';
import { useChat } from './hooks/useChat';
import { ChatButton } from './components/ChatButton';
import { ChatHeader } from './components/ChatHeader';
import { ChatMessages } from './components/ChatMessages';
import { ChatInput } from './components/ChatInput';

const Chat: React.FC = () => {
  const {
    open,
    setOpen,
    message,
    setMessage,
    messages,
    isLoading,
    handleSendMessage
  } = useChat();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleClickOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <div style={{ position: 'fixed', zIndex: 9999, pointerEvents: 'none', width: '100%', height: '100%' }}>
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
            borderRadius: isMobile ? 0 : 2,
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
          pointerEvents: 'none',
          '& .MuiDialog-container': {
            position: 'fixed',
            pointerEvents: 'none',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
          },
          '& .MuiBackdrop-root': {
            position: 'fixed',
            pointerEvents: 'none'
          },
          '& .MuiPaper-root': {
            pointerEvents: 'none',
            '& > *': {
              pointerEvents: 'auto'
            }
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
            p: '16px !important',
            pointerEvents: 'auto'
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
