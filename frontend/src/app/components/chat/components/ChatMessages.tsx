import React, { useRef, useEffect } from 'react';
import { Box, Paper, Typography } from '@mui/material';

import { Message } from '../../../../types/chat';
import { ChatMarkdown } from './ChatMarkdown';
import { SuggestedPrompts } from './SuggestedPrompts';

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  showSuggestions?: boolean;
  onSuggestedPrompt?: (prompt: string) => void;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isLoading,
  showSuggestions = false,
  onSuggestedPrompt,
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
  }, [messages, showSuggestions]);

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
        '& .chat-md': {
          fontSize: '0.9rem',
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 600,
          lineHeight: 1.5,
        },
        '& .chat-md-p': {
          margin: '0 0 0.5em',
          '&:last-child': { marginBottom: 0 },
        },
        '& .chat-md-list': {
          margin: '0.25em 0 0.5em',
          paddingLeft: '1.25em',
        },
        '& .chat-md-pre': {
          margin: '0.5em 0',
          padding: '0.6em 0.75em',
          overflowX: 'auto',
          borderRadius: '8px',
          backgroundColor: 'rgba(0,0,0,0.08)',
          fontSize: '0.8rem',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontWeight: 500,
        },
        '& .chat-md-code': {
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: '0.85em',
          fontWeight: 500,
          padding: '0.1em 0.35em',
          borderRadius: '4px',
          backgroundColor: 'rgba(0,0,0,0.08)',
        },
        '& .chat-md-link': {
          color: 'inherit',
          textDecoration: 'underline',
          textUnderlineOffset: '2px',
        },
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
              whiteSpace: msg.type === 'user' ? 'pre-line' : 'normal',
              border: `1px solid ${msg.type === 'user' ? 'transparent' : 'var(--primary-border)'}`,
            }}
          >
            {msg.type === 'agent' ? (
              <ChatMarkdown text={msg.text} isStreaming={msg.isStreaming} />
            ) : (
              <Typography
                sx={{
                  fontSize: '0.9rem',
                  fontFamily: "'Montserrat', sans-serif !important",
                  fontWeight: '600',
                  lineHeight: 1.5,
                }}
              >
                {msg.text}
              </Typography>
            )}
          </Paper>
        </Box>
      ))}

      {showSuggestions && onSuggestedPrompt && (
        <SuggestedPrompts onSelect={onSuggestedPrompt} disabled={isLoading} />
      )}

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
                fontWeight: '600',
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
