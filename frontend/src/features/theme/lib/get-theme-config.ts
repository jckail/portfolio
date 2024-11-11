import { PRIMARY } from '../../../config/constants';
import getParticlesConfig from './particles/config';
import type { Theme } from '../stores/theme-store';
import type { ParticlesConfig } from './particles/types';

// Array of available Zuni image numbers (2 through 19)
const ZUNI_IMAGE_NUMBERS = Array.from({ length: 18 }, (_, i) => i + 2);

export const getThemeConfig = (theme: Theme): Record<string, unknown> => {
  // Select random Zuni image if in party mode
  const randomZuniImage = theme === 'party' 
    ? `/images/zuni/Subject ${ZUNI_IMAGE_NUMBERS[Math.floor(Math.random() * ZUNI_IMAGE_NUMBERS.length)]}.png`
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
