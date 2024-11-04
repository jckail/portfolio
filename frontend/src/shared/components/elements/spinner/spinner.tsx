import React from 'react';
import { CircularProgress, Box, styled } from '@mui/material';

interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
}

const SpinnerWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: theme.spacing(2),
}));

const sizeMap = {
  small: 24,
  medium: 40,
  large: 56,
};

export const Spinner: React.FC<SpinnerProps> = ({ size = 'medium' }) => {
  return (
    <SpinnerWrapper>
      <CircularProgress
        size={sizeMap[size]}
        thickness={4}
        sx={{
          color: (theme) => theme.palette.primary.main,
          '& .MuiCircularProgress-circle': {
            strokeLinecap: 'round',
          },
        }}
      />
    </SpinnerWrapper>
  );
};
