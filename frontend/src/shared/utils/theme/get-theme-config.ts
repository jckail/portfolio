import { PRIMARY, WHITE, BLACK } from '../../../config/constants';
import { getParticlesConfig } from '../particles';
import type { Theme } from '../../../types/theme';
import type { ParticlesConfig, ParticleConfig } from '../../../types/particles';

const generateRandomZuniUrls = (): string[] => {
  const usedNumbers: Set<number> = new Set();
  const urls: string[] = [];

  while (urls.length < 4) {
    const randomNum: number = Math.floor(Math.random() * 19) + 1; // Random number between 1 and 19
    if (!usedNumbers.has(randomNum)) {
      usedNumbers.add(randomNum);
      urls.push(`/api/zuni?subject=${randomNum}`);
    }
  }

  return urls;
};

export const getThemeConfig = (theme: Theme): Record<string, unknown> | Record<string, unknown>[] => {
  // Use API endpoint for party mode
  const zuniImageUrls: string[] = theme === 'party' ? generateRandomZuniUrls() : [];

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

  if (theme === 'party') {
    return zuniImageUrls.map((url, index) => ({
      ...getParticlesConfig({
        particleColor: partyColors[index % partyColors.length],
        lineColor: partyColors[index % partyColors.length],
        backgroundColor: index === 0 ? BLACK : 'transparent', // Only first container sets background
        particleCount: 5,
        particleSize: 50,
        lineDistance: 450,
        lineWidth: 5,
        moveSpeed: 1,
        imageUrls: [url], // Pass single-element array with current URL
        imageSizeAnimation: {
          enable: true,
          speed: 1,
          minSize: 30,
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
      particleCount: 30,
      particleSize: 15,
      lineDistance: 500,
      lineWidth: 2,
      moveSpeed: 1,
    },
    dark: {
      particleColor: PRIMARY,
      lineColor: PRIMARY,
      backgroundColor: BLACK,
      particleCount: 30,
      particleSize: 15,
      lineDistance: 500,
      lineWidth: 2,
      moveSpeed: 1,
    },
    party: {
      particleColor: partyColors[0],
      lineColor: partyColors[0],
      backgroundColor: BLACK,
      particleCount: 5,
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
