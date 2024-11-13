import { PRIMARY, WHITE, BLACK } from '../../../config/constants';
import getParticlesConfig from './particles/config';
import type { Theme } from '../stores/theme-store';
import type { ParticlesConfig } from './particles/types';

export const getThemeConfig = (theme: Theme): Record<string, unknown> => {
  // Use API endpoint for party mode
  const zuniImageUrl = theme === 'party' 
    ? '/api/zuni'
    : '';

  const configs: Record<Theme, ParticlesConfig> = {
    light: getParticlesConfig({
      particleColor: [PRIMARY],
      lineColor: PRIMARY,
      backgroundColor: WHITE,
    }),
    dark: getParticlesConfig({
      particleColor: [PRIMARY],
      lineColor: PRIMARY,
      backgroundColor: BLACK,
      particleCount: 10,

    }),
    party: getParticlesConfig({
      particleColor: ['#ff00ff'],
      lineColor: '#ff00ff',
      backgroundColor: BLACK,
      particleCount: 15,
      particleSize: 64,
      lineDistance: 200,
      lineWidth: 2,
      moveSpeed: 1,
      imageUrl: zuniImageUrl,
      imageSizeAnimation: {
        enable: true,
        speed: 10,
        minSize: 4,
        sync: false
      }
    })
  };

  return configs[theme] as unknown as Record<string, unknown>;
};
