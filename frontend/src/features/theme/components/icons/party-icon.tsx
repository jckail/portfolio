import React from 'react';

const PartyIcon: React.FC = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Party hat */}
    <path d="M12 2L3 19h18L12 2z" />
    {/* Confetti pieces */}
    <path d="M4 4L6 6" />
    <path d="M18 4L16 6" />
    <path d="M3 11L5 13" />
    <path d="M19 11L17 13" />
    <circle cx="8" cy="16" r="1" />
    <circle cx="16" cy="16" r="1" />
  </svg>
);

export default PartyIcon;
