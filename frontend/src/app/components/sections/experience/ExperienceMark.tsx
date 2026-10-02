import React from 'react';

/**
 * Stand-in for a company logo on roles that have none (the sabbatical): a
 * compass drawn with currentColor so it follows every theme. Decorative; the
 * adjacent text carries the name.
 */
export const ExperienceMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="12" cy="12" r="9.5" />
    <path d="M15.8 8.2l-2.3 5.3-5.3 2.3 2.3-5.3z" />
    <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);
