import React from 'react';
import { styled } from '@mui/material/styles';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import MenuIcon from '@mui/icons-material/Menu';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';

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

const IconWrapper = styled('span')<{ size: 'small' | 'medium' | 'large' }>(({ theme, size }) => {
  const sizes = {
    small: '1rem',
    medium: '1.5rem',
    large: '2rem',
  };

  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    fontSize: sizes[size],
    width: sizes[size],
    height: sizes[size],
    transition: theme.transitions.create('transform', {
      duration: theme.transitions.duration.shorter,
    }),
    '&:hover': {
      transform: 'scale(1.1)',
    },
    '& > svg': {
      width: '100%',
      height: '100%',
    },
  };
});

export function Icon({ name, size = 'medium', className = '' }: IconProps) {
  const IconComponent = getIconComponent(name);

  return (
    <IconWrapper 
      size={size} 
      className={className} 
      role="img" 
      aria-label={name}
    >
      <IconComponent />
    </IconWrapper>
  );
}

function getIconComponent(name: IconName) {
  const icons: Record<IconName, React.ComponentType> = {
    github: GitHubIcon,
    linkedin: LinkedInIcon,
    download: DownloadIcon,
    close: CloseIcon,
    menu: MenuIcon,
    sun: LightModeIcon,
    moon: DarkModeIcon,
  };

  return icons[name];
}
