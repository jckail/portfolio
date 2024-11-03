import React from 'react';
import './spinner.css';

interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'light';
  className?: string;
}

export function Spinner({ 
  size = 'medium', 
  color = 'primary',
  className = '' 
}: SpinnerProps) {
  return (
    <div 
      className={`spinner spinner-${size} spinner-${color} ${className}`}
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// Usage example:
// <Spinner size="small" color="primary" />
// <Spinner size="medium" color="secondary" />
// <Spinner size="large" color="light" />
