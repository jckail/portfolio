import React, { Suspense, ReactNode } from 'react';

import { CircularProgress, Box, styled } from '@mui/material';

const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  padding: theme.spacing(2),
}));

interface LoadingBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function LoadingBoundary({ children, fallback }: LoadingBoundaryProps) {
  return (
    <Suspense
      fallback={
        fallback || (
          <LoadingContainer>
            <CircularProgress
              size={40}
              thickness={4}
              sx={{
                color: (theme) => theme.palette.primary.main,
                '& .MuiCircularProgress-circle': {
                  strokeLinecap: 'round',
                },
              }}
            />
          </LoadingContainer>
        )
      }
    >
      {children}
    </Suspense>
  );
}
