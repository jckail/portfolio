import { PRIMARY, WHITE, BLACK } from '../../../config/constants';
import getParticlesConfig from './particles/config';
import type { Theme } from '../stores/theme-store';
import type { ParticlesConfig, ParticleConfig } from './particles/types';

export const getThemeConfig = (theme: Theme): Record<string, unknown> => {
  // Use API endpoint for party mode
  const zuniImageUrls = theme === 'party' 
    ? ['/api/zuni','/api/zuni'] // You can add more URLs here for multiple images
    : [];

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
      particleColor: '#ff00ff',
      lineColor: '#ff00ff',
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

  return getParticlesConfig(configs[theme]) as unknown as Record<string, unknown>;
};
