import React, { useMemo } from 'react';
import { Box, Button } from '@mui/material';

/** Base prompts plus a couple that exercise chat navigation tools. */
const BASE_PROMPTS = [
  'What is Jordan working on at Together AI?',
  'Summarize his AI and ML experience',
  'What are his strongest technical skills?',
  'Tell me about his open-source projects',
] as const;

const ACTION_PROMPTS = [
  'Show me his resume',
  'Open the Super Teacher project',
  'Take me to his experience at Together AI',
  'Help me draft an email to Jordan',
] as const;

function pickPrompts(): string[] {
  // Rotate action prompts so the empty state feels fresh across visits
  const hour = new Date().getHours();
  const action = ACTION_PROMPTS[hour % ACTION_PROMPTS.length];
  return [...BASE_PROMPTS.slice(0, 3), action];
}

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export const SuggestedPrompts: React.FC<SuggestedPromptsProps> = ({
  onSelect,
  disabled = false,
}) => {
  const prompts = useMemo(() => pickPrompts(), []);

  return (
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
      {prompts.map(prompt => (
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
};

export default SuggestedPrompts;
