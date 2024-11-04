import React from 'react';
import {
  Button as MuiButton,
  ButtonProps as MuiButtonProps,
  CircularProgress,
  styled
} from '@mui/material';

interface ButtonProps extends Omit<MuiButtonProps, 'variant'> {
  variant?: 'primary' | 'secondary' | 'text';
  isLoading?: boolean;
}

const StyledButton = styled(MuiButton)(({ theme }) => ({
  position: 'relative',
  '&.loading': {
    color: 'transparent',
    '& .MuiCircularProgress-root': {
      position: 'absolute',
      left: '50%',
      top: '50%',
      marginLeft: -12,
      marginTop: -12,
    },
  },
}));

export function Button({
  children,
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  // Map custom variants to MUI variants
  const muiVariant = {
    primary: 'contained',
    secondary: 'outlined',
    text: 'text',
  }[variant] as MuiButtonProps['variant'];

  return (
    <StyledButton
      variant={muiVariant}
      size={size}
      className={`${isLoading ? 'loading' : ''} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {children}
      {isLoading && (
        <CircularProgress
          size={24}
          color={variant === 'primary' ? 'inherit' : 'primary'}
        />
      )}
    </StyledButton>
  );
}
