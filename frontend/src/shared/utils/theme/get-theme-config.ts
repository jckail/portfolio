import { PRIMARY, WHITE, BLACK } from '../../../config/constants';
import type { Theme } from '../../../types/theme';
import type { ISourceOptions } from "@tsparticles/engine";

const generateRandomZuniUrls = (): string[] => {
  const usedNumbers: Set<number> = new Set();
  const urls: string[] = [];

  while (urls.length < 4) {
    const randomNum: number = Math.floor(Math.random() * 19) + 1;
    if (!usedNumbers.has(randomNum)) {
      usedNumbers.add(randomNum);
      urls.push(`/api/zuni?subject=${randomNum}`);
    }
  }

  return urls;
};

const createParticleConfig = ({
  particleColor,
  lineColor,
  backgroundColor,
  particleCount,
  particleSize,
  lineDistance,
  lineWidth,
  moveSpeed,
  imageUrls,
  imageSizeAnimation
}: {
  particleColor: string | string[],
  lineColor: string,
  backgroundColor: string,
  particleCount: number,
  particleSize: number,
  lineDistance: number,
  lineWidth: number,
  moveSpeed: number,
  imageUrls?: string[],
  imageSizeAnimation?: {
    enable: boolean,
    speed: number,
    minSize: number,
    sync: boolean
  }
}): ISourceOptions => ({
  background: {
    color: {
      value: backgroundColor,
    },
  },
  fpsLimit: 120,
  interactivity: {
    events: {
      onClick: {
        enable: true,
        mode: "push",
      },
      onHover: {
        enable: true,
        mode: "grab",
      },
    },
    modes: {
      grab: {
        distance: 250,
      },
      push: {quantity:1,},
      
      bubble: {
        distance: 200,
        duration: 0.4,
      },
    },
  },
  particles: {
    color: {
      value: particleColor,
    },
    links: {
      color: lineColor,
      distance: lineDistance,
      enable: true,
      opacity: 1,
      width: lineWidth,
    },
    move: {
      direction: "none",
      enable: true,
      outModes: {
        default: "bounce",
      },
      random: false,
      speed: moveSpeed,
      straight: false,
    },
    number: {
      density: {
        enable: false,
      },
      value: particleCount,
    },
    opacity: {
      value: 1,
    },
    shape: {
      type: imageUrls && imageUrls.length > 0 ? ["image"] : ["circle"],
      options: {
        image: imageUrls && imageUrls.length > 0 ? imageUrls.map(url => ({
          src: url,
          width: particleSize,
          height: particleSize
        })) : undefined
      }
    },
    size: {
      value: { min: particleSize / 2, max: particleSize },
      animation: imageSizeAnimation ? {
        enable: imageSizeAnimation.enable,
        speed: imageSizeAnimation.speed,
        sync: imageSizeAnimation.sync,
        startValue: "min",
        destroy: "max"
      } : undefined
    },
  },
  detectRetina: true,
});

export const getThemeConfig = (theme: Theme): ISourceOptions | ISourceOptions[] => {
  const zuniImageUrls: string[] = theme === 'party' ? generateRandomZuniUrls() : [];
  
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
    return zuniImageUrls.map((url, index) => createParticleConfig({
      particleColor: partyColors[index % partyColors.length],
      lineColor: partyColors[index % partyColors.length],
      backgroundColor: 'transparent',
      particleCount: 15,
      particleSize: 50,
      lineDistance: 250,
      lineWidth: 5,
      moveSpeed: .5,
      imageUrls: [url],
      imageSizeAnimation: {
        enable: true,
        speed: 1,
        minSize: 30,
        sync: false
      }
    }));
  }

  const configs = {
    light: {
      particleColor: PRIMARY,
      lineColor: PRIMARY,
      backgroundColor: 'transparent',
      particleCount: 10,
      particleSize: 10,
      lineDistance: 250,
      lineWidth: 3,
      moveSpeed: .1,
    },
    dark: {
      particleColor: PRIMARY,
      lineColor: PRIMARY,
      backgroundColor: 'transparent',
      particleCount: 10,
      particleSize: 10,
      lineDistance: 250,
      lineWidth: 3,
      moveSpeed: .1,
    },
    party: {
      particleColor: partyColors[0],
      lineColor: partyColors[0],
      backgroundColor: 'transparent',
      particleCount: 10,
      particleSize: 64,
      lineDistance: 100,
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

  return createParticleConfig(configs[theme]);
};
