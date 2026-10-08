import React from 'react';

/** Name meaningful loading states; decorative skeletons can omit announcements. */
export const LoadingSpinner: React.FC<{ label?: string; decorative?: boolean }> = ({
  label = 'Loading content', decorative = false,
}) => (
  <div className="section-loading" role={decorative ? undefined : 'status'}
    aria-label={decorative ? undefined : label} aria-hidden={decorative || undefined}>
    <div className="loading-spinner" aria-hidden="true"></div>
  </div>
);
