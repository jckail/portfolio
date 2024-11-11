import { ParticlesConfig } from './types';

const getParticlesConfig = (
  options: {
    particleColor: string;
    lineColor: string;
    particleCount?: number;
    particleSize?: number;
    lineDistance?: number;
    lineWidth?: number;
    moveSpeed?: number;
    bubbleSize?: number;
    bubbleSpeed?: number;
    imageUrl?: string;
    imageSizeAnimation?: {
      enable?: boolean;
      speed?: number;
      minSize?: number;
      sync?: boolean;
    };
  }
): ParticlesConfig => {
  const {
    particleColor,
    lineColor,
    particleCount = 25,
    particleSize = 1,
    lineDistance = 225,
    lineWidth = 2,
    moveSpeed = 0.3,
    bubbleSize = 8,
    bubbleSpeed = 5,
    imageUrl,
    imageSizeAnimation
  } = options;
  
  const baseSize = imageUrl ? particleSize : particleSize;
  
  // Default animation settings
  const defaultSizeAnimation = {
    enable: false,
    speed: 10,
    minSize: baseSize / 2,
    sync: false
  };

  // Merge with provided animation settings
  const finalSizeAnimation = {
    ...defaultSizeAnimation,
    ...(imageSizeAnimation || {}),
    // Ensure enable is always boolean
    enable: imageSizeAnimation?.enable ?? defaultSizeAnimation.enable
  };
  
  return {
    background: {
      color: 'transparent'
    },
    particles: {
      number: {
        value: particleCount,
        density: {
          enable: false,
          value_area: 50
        }
      },
      color: {
        value: particleColor
      },
      shape: imageUrl ? {
        type: "image",
        image: {
          src: imageUrl,
          width: baseSize,
          height: baseSize
        }
      } : {
        type: "circle",
        stroke: {
          width: 0,
          color: particleColor
        }
      },
      opacity: {
        value: 0.6,
        random: false,
        anim: {
          enable: false,
          speed: 1,
          opacity_min: 1,
          sync: false
        }
      },
      size: {
        value: baseSize,
        random: false,
        anim: {
          enable: finalSizeAnimation.enable,
          speed: finalSizeAnimation.speed,
          size_min: finalSizeAnimation.minSize,
          sync: finalSizeAnimation.sync
        }
      },
      line_linked: {
        enable: true,
        distance: lineDistance,
        color: lineColor,
        opacity: 1,
        width: lineWidth
      },
      move: {
        enable: true,
        speed: moveSpeed,
        direction: "none",
        random: true,
        straight: false,
        out_mode: "bounce",
        bounce: false,
        attract: {
          enable: false,
          rotateX: 600,
          rotateY: 1200
        }
      }
    },
    interactivity: {
      detect_on: "window",
      events: {
        onhover: {
          enable: true,
          mode: "grab"
        },
        onclick: {
          enable: true,
          mode: "bubble"
        },
        resize: true
      },
      modes: {
        grab: {
          distance: 400,
          line_linked: {
            opacity: 2
          }
        },
        bubble: {
          distance: 400,
          size: bubbleSize,
          duration: 2,
          opacity: 4,
          speed: bubbleSpeed
        },
        repulse: {
          distance: 200,
          duration: 0.4
        },
        push: {
          particles_nb: 4
        },
        remove: {
          particles_nb: 2
        }
      }
    },
    retina_detect: true
  };
};

export default getParticlesConfig;
