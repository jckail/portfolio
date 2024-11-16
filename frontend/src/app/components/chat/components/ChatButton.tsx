import React, { useState, useEffect } from 'react';
import { Box, Fab } from '@mui/material';

interface ChatButtonProps {
  onClick: (e: React.MouseEvent) => void;
}

export const ChatButton: React.FC<ChatButtonProps> = ({ onClick }) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
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
        onClick={onClick}
      >
        ✨AI
      </Fab>
    </Box>
  );
};
