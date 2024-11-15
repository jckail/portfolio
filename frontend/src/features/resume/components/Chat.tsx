import React, { useState, useRef, useEffect } from 'react';
import { 
  Fab, 
  Dialog, 
  DialogContent, 
  DialogTitle,
  IconButton,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';

interface Message {
  type: 'user' | 'agent';
  text: string;
}

const Chat: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { type: 'agent', text: 'Hello! I\'m your AI assistant. I can help you with:' },
    { type: 'agent', text: '• Understanding my background and experience\n• Learning about my technical skills\n• Discussing potential collaborations' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const [initialContextSent, setInitialContextSent] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const clientId = useRef(Date.now().toString());
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getPageContext = () => {
    const mainContent = document.querySelector('#root') as HTMLElement;
    if (!mainContent) return '';

    const clone = mainContent.cloneNode(true) as HTMLElement;
    const chatDialog = clone.querySelector('[role="dialog"]');
    if (chatDialog) {
      chatDialog.remove();
    }

    const context = {
      html: clone.innerHTML,
      text: clone.textContent?.trim() || ''
    };

    return JSON.stringify(context);
  };

  useEffect(() => {
    if (open && !webSocket) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/${clientId.current}`;
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket Connected');
        if (!initialContextSent) {
          const pageContext = getPageContext();
          ws.send(JSON.stringify({
            type: 'context',
            content: pageContext
          }));
          setInitialContextSent(true);
        }
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setMessages(prev => [...prev, { type: 'agent', text: data.message }]);
        setIsLoading(false);
      };

      ws.onerror = (error) => {
        console.error('WebSocket Error:', error);
        setMessages(prev => [...prev, { 
          type: 'agent', 
          text: 'I apologize, but I encountered an error. Please try again.' 
        }]);
        setIsLoading(false);
      };

      ws.onclose = () => {
        console.log('WebSocket Disconnected');
        setWebSocket(null);
        setInitialContextSent(false);
      };

      setWebSocket(ws);
    }

    return () => {
      if (webSocket) {
        webSocket.close();
      }
    };
  }, [open, initialContextSent]);

  const handleClickOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSendMessage = async () => {
    if (message.trim() && webSocket && webSocket.readyState === WebSocket.OPEN) {
      setMessages(prev => [...prev, { type: 'user', text: message }]);
      setIsLoading(true);
      
      webSocket.send(JSON.stringify({
        type: 'message',
        content: message
      }));
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div style={{ position: 'fixed', zIndex: 9999, pointerEvents: 'none', isolation: 'isolate' }}>
      {!open && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 20,
            left: 20,
            zIndex: 9999,
            pointerEvents: 'auto',
            '@keyframes glowPulse': {
              '0%': {
                boxShadow: '0 0 8px 3px rgba(0, 0, 0, 0.2), 0 0 15px 5px rgba(0, 0, 0, 0.1)'
              },
              '50%': {
                boxShadow: '0 0 12px 5px rgba(0, 0, 0, 0.3), 0 0 20px 8px rgba(0, 0, 0, 0.15)'
              },
              '100%': {
                boxShadow: '0 0 8px 3px rgba(0, 0, 0, 0.2), 0 0 15px 5px rgba(0, 0, 0, 0.1)'
              }
            }
          }}
        >
          <Fab
            sx={{
              bgcolor: 'var(--section-background)',
              border:'var(--border-thickness) solid var(--primary-border)', 
              color: 'var(--text-color)',
              width: 70,
              height: 70,
              transition: 'all 0.3s ease-in-out',
              animation: isScrolled ? 'glowPulse 2s infinite' : 'none',
              '&:hover': {
                bgcolor: 'var(--primary)',
                color: 'white',
                transform: 'scale(1.05)',
              },
              fontSize: '1.5rem',
              backdropFilter: 'blur(var(--section-background-blur))',
            }}
            aria-label="Chat with AI"
            onClick={handleClickOpen}
          >
            ✨AI
          </Fab>
        </Box>
      )}

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
            width: isMobile ? '100%' : '500px', // Fixed width instead of percentage
            height: isMobile ? '100%' : '90vh',
            maxHeight: isMobile ? '99%' : '90vh',
            borderRadius: isMobile ? 0 : 2,
            margin: isMobile ? 0 : '1vh 0 15vh 0', // Removed right margin
            display: 'flex',
            flexDirection: 'column',
            position: isMobile ? 'relative' : 'fixed',
            left: isMobile ? 'auto' : 0,
            top: isMobile ? 'auto' : 0,
            bgcolor: 'var(--surface-color)',
            color: 'var(--text-color)',
            backdropFilter: 'blur(16px)',
            background: 'rgba(var(--surface-color-rgb), 0.85)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            isolation: 'isolate',
            overflowY: 'hidden',
          }
        }}
        sx={{
          position: 'fixed',
          '& .MuiDialog-container': {
            position: 'fixed',
            pointerEvents: 'none',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
          },
          '& .MuiPaper-root': {
            pointerEvents: 'auto',
          },
          '& .MuiBackdrop-root': {
            position: 'fixed',
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            m: 0, 
            p: 2, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            bgcolor: 'var(--primary-border)',
            color: 'white',
            flexShrink: 0,
          }}
        >
          <div style={{ 
            fontSize: '1.25rem',
            fontWeight: 500,
            fontFamily: '"Roboto","Helvetica","Arial",sans-serif'
          }}>
            ✨ Jordan's AI Assistant
          </div>
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{
              color: 'white',
              padding: '12px',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.1)',
              }
            }}
          >
            <CloseIcon sx={{ fontSize: isMobile ? 28 : 24 }} />
          </IconButton>
        </DialogTitle>

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
          <Box 
            ref={messagesContainerRef}
            sx={{ 
              flexGrow: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              pb: '130px',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {messages.map((msg, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <Paper
                  elevation={1}
                  sx={{
                    p: 1.5,
                    maxWidth: '85%',
                    backgroundColor: msg.type === 'user' ? 'var(--primary-border)' : 'var(--section-background)',
                    color: msg.type === 'user' ? 'white' : 'var(--text-color)',
                    borderRadius: msg.type === 'user' ? '15px 15px 5px 15px' : '15px 15px 15px 5px',
                    whiteSpace: 'pre-line',
                    border: `1px solid ${msg.type === 'user' ? 'transparent' : 'var(--primary-border)'}`,
                  }}
                >
                  <Typography variant="body1">{msg.text}</Typography>
                </Paper>
              </Box>
            ))}
            {isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                <Paper
                  elevation={1}
                  sx={{
                    p: 1.5,
                    backgroundColor: 'var(--primary)',
                    color: 'var(--text-color)',
                    borderRadius: '15px 15px 15px 5px',
                    border: '1px solid var(--primary-border)',
                  }}
                >
                  <Typography variant="body1">Thinking...</Typography>
                </Paper>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          <Box 
            sx={{ 
              display: 'flex', 
              gap: 1, 
              alignItems: 'flex-end',
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              bgcolor: 'var(--surface-color)',
              p: 2,
              pb: '1px',
              borderTop: '1px solid var(--primary-border)',
              backgroundColor: 'var(--solid-color)',
              
            }}
          >
            <TextField
              fullWidth
              multiline
              maxRows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              variant="outlined"
              size="small"
              disabled={isLoading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: 'var(--text-color)',
                  backgroundColor: 'var(--section-background)',
                  '& fieldset': {
                    borderColor: 'var(--primary-border)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'var(--primary-border)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'var(--primary-border)',
                  },
                },
                '& .MuiInputBase-input::placeholder': {
                  color: 'var(--text-secondary)',
                  opacity: 0.7,
                },
              }}
            />
            <Button
              variant="contained"
              onClick={handleSendMessage}
              disabled={!message.trim() || isLoading}
              sx={{ 
                minWidth: 'auto', 
                p: 1,
                bgcolor: 'var(--primary-border)',
                '&:hover': {
                  bgcolor: 'var(--primary-hover)',
                },
                '&.Mui-disabled': {
                  bgcolor: 'var(--text-secondary)',
                  opacity: 0.5,
                },
              }}
            >
              <SendIcon />
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Chat;
