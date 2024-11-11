import { PRIMARY } from '../../../config/constants';
import getParticlesConfig from './particles/config';
import type { Theme } from '../stores/theme-store';
import type { ParticlesConfig } from './particles/types';

// Array of available Zuni image numbers (2 through 19)

export const getThemeConfig = (theme: Theme, imageNum: number): Record<string, unknown> => {
  // Select random Zuni image if in party mode
  const randomZuniImage = theme === 'party' 
    ? `/images/zuni/Subject ${imageNum}.png`
    : '';

  const configs: Record<Theme, ParticlesConfig> = {
    light: getParticlesConfig({
      particleColor: PRIMARY,
      lineColor: PRIMARY,
      particleCount: 20,
      particleSize: 6,
      lineDistance: 400,
      lineWidth: 3,
      moveSpeed: .25,
    }),
    dark: getParticlesConfig({
      particleColor: PRIMARY,
      lineColor: PRIMARY,
      particleCount: 20,
      particleSize: 6,
      lineDistance: 400,
      lineWidth: 3,
      moveSpeed: .25,
    }),
    party: getParticlesConfig({
      particleColor: '#ff00ff',
      lineColor: '#ff00ff',
      particleCount: 15,
      particleSize: 64,
      lineDistance: 200,
      lineWidth: 2,
      moveSpeed: 1,
      imageUrl: randomZuniImage,
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
