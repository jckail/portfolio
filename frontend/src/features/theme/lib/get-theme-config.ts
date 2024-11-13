import { PRIMARY, WHITE, BLACK } from '../../../config/constants';
import getParticlesConfig from './particles/config';
import type { Theme } from '../stores/theme-store';
import type { ParticlesConfig, ParticleConfig } from './particles/types';

export const getThemeConfig = (theme: Theme): Record<string, unknown> | Record<string, unknown>[] => {
  // Use API endpoint for party mode
  const zuniImageUrls = theme === 'party' 
    ? ['/api/zuni','/api/zuni','/api/zuni','/api/zuni'] // Add more URLs here for multiple images
    : [];

  // Party color palette
  const partyColors = [
    '#ff00ff', // Hot pink
    '#00ffff', // Cyan
    '#ffff00', // Yellow
    '#00ff00', // Lime green
    '#ff69b4', // Pink
    '#40e0d0', // Turquoise
    '#ffd700', // Gold
    '#98fb98', // Pale green
    '#ff1493', // Deep pink
    '#00ced1', // Dark turquoise
    '#f0e68c', // Khaki
    '#90ee90'  // Light green
  ];

  if (theme === 'party' && zuniImageUrls.length > 0) {
    return zuniImageUrls.map((url, index) => ({
      ...getParticlesConfig({
        particleColor: partyColors[index % partyColors.length],
        lineColor: partyColors[index % partyColors.length],
        backgroundColor: index === 0 ? BLACK : 'transparent', // Only first container sets background
        particleCount: 5,
        particleSize: 20,
        lineDistance: 250,
        lineWidth: 5,
        moveSpeed: 1,
        imageUrls: [url], // Pass single-element array with current URL
        imageSizeAnimation: {
          enable: true,
          speed: 1,
          minSize: 10,
          sync: false
        }
      })
    }));
  }

  const configs: Record<Theme, ParticleConfig> = {
    light: {
      particleColor: PRIMARY,
      lineColor: PRIMARY,
      backgroundColor: WHITE,
    },
    dark: {
      particleColor: PRIMARY,
      lineColor: PRIMARY,
      backgroundColor: BLACK,
      particleCount: 10,
    },
    party: {
      particleColor: partyColors[0],
      lineColor: partyColors[0],
      backgroundColor: BLACK,
      particleCount: 15,
      particleSize: 64,
      lineDistance: 200,
      lineWidth: 2,
      moveSpeed: 1,
      imageUrls: zuniImageUrls,
      imageSizeAnimation: {
        enable: true,
        speed: 10,
        minSize: 4,
        sync: false
      }
    }
  };

  return { ...getParticlesConfig(configs[theme]) };
};
