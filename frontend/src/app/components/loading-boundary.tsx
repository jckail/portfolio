import React, { Suspense, ReactNode } from 'react';
import { Spinner } from '@/shared/components/elements';

interface LoadingBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function LoadingBoundary({ children, fallback }: LoadingBoundaryProps) {
  return (
    <Suspense
      fallback={
        fallback || (
          <div className="loading-boundary">
            <Spinner size="large" />
          </div>
        )
      }
    >
      {children}
    </Suspense>
  );
}
