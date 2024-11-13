import React, { useEffect } from 'react';

interface BackgroundProviderProps {
  children: React.ReactNode;
  backgroundColor: string;
}

function BackgroundProvider({ children, backgroundColor }: BackgroundProviderProps) {
  useEffect(() => {
    // Set background color on body
    document.body.style.backgroundColor = backgroundColor || 'transparent';

    // Cleanup
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, [backgroundColor]); // Re-run when backgroundColor changes

  return <>{children}</>;
}

export { BackgroundProvider };
