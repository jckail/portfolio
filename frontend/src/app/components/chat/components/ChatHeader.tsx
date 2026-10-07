import React from 'react';
import { DialogTitle, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface ChatHeaderProps {
  onClose: () => void;
  isMobile: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ onClose, isMobile }) => {
  return (
    <DialogTitle
      id="portfolio-assistant-title"
      className="party-pinned"
      sx={{
        m: 0,
        p: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        bgcolor: 'var(--primary-border)',
        color: 'white',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          fontSize: isMobile ? '1.1rem' : '1.25rem',
          fontWeight: 600,
          fontFamily: '"Quantico",sans-serif',
        }}
      >
        Jordan&apos;s AI portfolio assistant
      </div>
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{
          color: 'white',
          padding: '12px',
          '&:hover': {
            bgcolor: 'var(--primary)',
          },
        }}
      >
        <CloseIcon sx={{ fontSize: 28 }} />
      </IconButton>
    </DialogTitle>
  );
};
