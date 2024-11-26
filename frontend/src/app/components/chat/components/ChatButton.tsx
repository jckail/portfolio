import React, { useState, useEffect } from 'react';
import { Box, Fab } from '@mui/material';
import {useMediaQuery,useTheme } from '@mui/material';

interface ChatButtonProps {
  onClick: (e: React.MouseEvent) => void;
}

export const ChatButton: React.FC<ChatButtonProps> = ({ onClick }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
        position: isMobile ?'fixed':'fixed',
        bottom: isMobile ?15:20,
        left: isMobile ?5:20,
        zIndex: 9999,
        pointerEvents: 'auto',
        fontSize: isMobile ? '1.5rem' :'2.2rem',
        fontFamily: 'Quantico, sans-serif !important',
        fontWeight: '700 !important',
        backdropFilter: '1px',
        '@keyframes glowPulse': {
          '0%': {
            transform: 'scale(1)',
            
          },
          '5%': {
            transform: 'scale(1.0125)',
            
          },
          '15%': {
            transform: 'scale(1.025)',
            
          },
          '25%': {
            transform: 'scale(1.05)',
            
          },
          '35%': {
            transform: 'scale(1.1)',
            
          },
          '50%': {
            transform: 'scale(1.1)',
            
          },
          '65%': {
            transform: 'scale(1.1)',
            
          },
          '75%': {
            transform: 'scale(1.05)',
            
          },
          '85%': {
            transform: 'scale(1.025)',
            
          },
          '95%': {
            transform: 'scale(1.0125)',
            
          },
          '100%': {
            transform: 'scale(1)',
            
          }
        }
      }}
    >
      <Fab
        sx={{
          bgcolor: 'var(--ai-background-color);',
          
          color: 'white',
          width: isMobile ? 60 : 70,
          height: isMobile ? 60 : 70,
          transition: ' .5s ease-in-out',
          animation:  'glowPulse 10s infinite' ,
          '&:hover': {
            bgcolor: 'var(--primary)',
            color: 'white',
            transform: 'scale(1.5)',
          },
          fontSize: isMobile ? '2rem' :'2.5rem',
          fontFamily: 'Quantico, sans-serif !important',
          fontWeight: '700 !important',
          backdropFilter: '1px'
        }}
        aria-label="Chat with AI"
        onClick={onClick}
      >
        🤖
      </Fab>
    </Box>
  );
}
