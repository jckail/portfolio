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
        onClick={onClose}
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
  );
};
