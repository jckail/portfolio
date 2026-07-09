import React from 'react';
import { Box, Button } from '@mui/material';

export const SUGGESTED_PROMPTS = [
  'What did Jordan do at Meta?',
  'Summarize his AI and ML experience',
  'What are his strongest technical skills?',
  'Tell me about his open-source projects',
] as const;

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export const SuggestedPrompts: React.FC<SuggestedPromptsProps> = ({
  onSelect,
  disabled = false,
}) => (
  <Box
    sx={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 1,
      mb: 1,
      justifyContent: 'flex-start',
    }}
    role="group"
    aria-label="Suggested questions"
  >
    {SUGGESTED_PROMPTS.map(prompt => (
      <Button
        key={prompt}
        size="small"
        variant="outlined"
        disabled={disabled}
        onClick={() => onSelect(prompt)}
        sx={{
          textTransform: 'none',
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 600,
          fontSize: '0.8rem',
          color: 'var(--text-color)',
          borderColor: 'var(--primary-border)',
          borderRadius: '12px',
          px: 1.5,
          py: 0.5,
          lineHeight: 1.3,
          textAlign: 'left',
          '&:hover': {
            borderColor: 'var(--primary-hover)',
            backgroundColor: 'var(--section-background)',
          },
        }}
      >
        {prompt}
      </Button>
    ))}
  </Box>
);

export default SuggestedPrompts;
