import React, { useRef, useEffect } from 'react';
import { Box, Paper, Typography } from '@mui/material';

import { PortfolioCards, type PortfolioCard } from '../../../agent/portfolio-cards';
import { ConfirmActionCard } from './ConfirmActionCard';
import { ChatMarkdown } from './ChatMarkdown';
import { SuggestedPrompts } from './SuggestedPrompts';

import type { ConfirmArgs, Message, PendingAction } from '../../../../types/chat';

interface ChatMessagesProps {
  messages: Message[];
  portfolioCards?: PortfolioCard[];
  isLoading: boolean;
  showSuggestions?: boolean;
  onSuggestedPrompt?: (prompt: string) => void;
  pendingActions?: PendingAction[];
  onConfirmAction?: (id: string, email: string, args: ConfirmArgs) => Record<string, string> | null;
  onCancelAction?: (id: string) => void;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  portfolioCards = [],
  isLoading,
  showSuggestions = false,
  onSuggestedPrompt,
  pendingActions = [],
  onConfirmAction,
  onCancelAction,
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
  }, [messages, showSuggestions, pendingActions.length, portfolioCards.length]);

  return (
    <Box
      ref={messagesContainerRef}
      sx={{
        flexGrow: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        pb: 1,
        minHeight: 0,
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
        '& .chat-md-heading': {
          margin: '1em 0 0.4em',
          fontFamily: 'inherit',
          fontSize: '1.05em',
          fontWeight: 700,
          lineHeight: 1.4,
          '&:first-child': { marginTop: 0 },
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
      {/* Keep the live region mounted before loading starts. Announce the
          response state once, rather than every streamed text delta. */}
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {isLoading ? 'Assistant is responding.' : ''}
      </span>
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
            className={msg.type === 'user' ? 'party-pinned' : undefined}
            sx={{
              p: 1.5,
              maxWidth: '95%',
              backgroundColor:
                msg.type === 'user' ? 'var(--primary-border)' : 'var(--section-background)',
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

      <PortfolioCards cards={portfolioCards} onPrompt={onSuggestedPrompt} disabled={isLoading} />

      {onConfirmAction &&
        onCancelAction &&
        pendingActions.map((action) => (
          <ConfirmActionCard
            key={action.id}
            action={action}
            onConfirm={onConfirmAction}
            onCancel={onCancelAction}
          />
        ))}

      {showSuggestions && pendingActions.length === 0 && onSuggestedPrompt && (
        <SuggestedPrompts onSelect={onSuggestedPrompt} disabled={isLoading} />
      )}

      {isLoading && !messages[messages.length - 1]?.isStreaming && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Paper
            elevation={1}
            className="party-pinned"
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
