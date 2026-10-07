import React from 'react';
import { Box, Button } from '@mui/material';

/** Stable entry points: the label scans quickly; the request sets useful boundaries. */
const PROMPTS = [
  {
    label: 'Recruiter brief',
    prompt:
      'Give me a concise recruiter brief on Jordan: scope, strongest engineering evidence, and relevant portfolio links. Flag anything the portfolio does not establish.',
  },
  {
    label: 'Compare a role',
    prompt:
      'Help me assess Jordan for a role. Ask me to paste the job description, then compare the requirements with portfolio evidence and identify gaps or questions to ask him.',
  },
  {
    label: 'Agent engineering',
    prompt:
      "Explain Jordan's agent engineering experience using specific portfolio evidence and links. Distinguish his responsibilities from team outcomes.",
  },
  {
    label: 'Explore projects',
    prompt:
      "Help me explore Jordan's most relevant engineering projects. Summarize the problem, his contribution, and available links without inventing results.",
  },
  {
    label: 'Draft an introduction',
    prompt:
      'Help me draft a recruiting introduction to Jordan. Ask for the role and context first, then let me review the message in a confirmation card before anything is sent.',
  },
  {
    label: 'Request a meeting',
    prompt:
      'Help me request a meeting with Jordan. Ask for the purpose and proposed time with timezone, then show a confirmation card. Treat this as a request, not a confirmed booking.',
  },
] as const;

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export const SuggestedPrompts: React.FC<SuggestedPromptsProps> = ({
  onSelect,
  disabled = false,
}) => {
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
      {PROMPTS.map(({ label, prompt }) => (
        <Button
          key={label}
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
          {label}
        </Button>
      ))}
    </Box>
  );
};

export default SuggestedPrompts;
