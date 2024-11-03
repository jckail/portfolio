import React from 'react';
import './icon.css';

export type IconName = 
  | 'github'
  | 'linkedin'
  | 'download'
  | 'close'
  | 'menu'
  | 'sun'
  | 'moon';

interface IconProps {
  name: IconName;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function Icon({ name, size = 'medium', className = '' }: IconProps) {
  return (
    <span className={`icon icon-${size} ${className}`} role="img" aria-label={name}>
      {getIconContent(name)}
    </span>
  );
}

function getIconContent(name: IconName): string {
  const icons: Record<IconName, string> = {
    github: '🐙',
    linkedin: '💼',
    download: '⬇️',
    close: '✕',
    menu: '☰',
    sun: '☀️',
    moon: '🌙',
  };

  return icons[name];
}

// Usage example:
// <Icon name="github" size="small" />
// <Icon name="linkedin" size="medium" />
// <Icon name="download" size="large" />
