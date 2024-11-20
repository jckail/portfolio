import React from 'react';
import { Box, TextField, Button } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

interface ChatInputProps {
  message: string;
  setMessage: (message: string) => void;
  handleSendMessage: () => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  message,
  setMessage,
  handleSendMessage,
  isLoading
}) => {
  const handleKeyPress = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
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
        pb: '20px',
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
  );
};
