import React, { useRef, useEffect } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { Message } from '../../../../types/chat';

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({ 
  messages, 
  isLoading
}) => {
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

  return (
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
              maxWidth: '95%',
              backgroundColor: msg.type === 'user' ? 'var(--primary-border)' : 'var(--section-background)',
              color: msg.type === 'user' ? 'white' : 'var(--text-color)',
              borderRadius: msg.type === 'user' ? '15px 15px 5px 15px' : '15px 15px 15px 5px',
              whiteSpace: 'pre-line',
              border: `1px solid ${msg.type === 'user' ? 'transparent' : 'var(--primary-border)'}`,
            }}
          >
            <Typography 
              sx={{
                fontSize: '0.9rem',
                fontFamily: "'Montserrat', sans-serif !important",
                fontWeight: "600",
                lineHeight: 1.5
              }}
            >
              {msg.text}
              {msg.isStreaming && <span className="cursor">|</span>}
            </Typography>
          </Paper>
        </Box>
      ))}
      {isLoading && !messages[messages.length - 1]?.isStreaming && (
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
            <Typography 
              sx={{
                fontSize: '0.9rem',
                fontFamily: "'Montserrat', sans-serif !important",
                fontWeight: "600",
                lineHeight: 1.5,
                color: 'white',
              }}
            >
              Thinking...
            </Typography>
          </Paper>
        </Box>
      )}
      <div ref={messagesEndRef} />
    </Box>
  );
};
