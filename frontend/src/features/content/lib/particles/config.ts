import { ParticlesConfig, ParticleConfig, ParticleImage } from './types';

const getParticlesConfig = (config: ParticleConfig): ParticlesConfig => {
  const {
    particleColor,
    lineColor,
    backgroundColor,
    particleCount = 10,
    particleSize = 40,
    lineDistance = 400,
    lineWidth = 10,
    moveSpeed = 0.25,
    bubbleSize = 8,
    bubbleSpeed = 5,
    imageUrls = [],
    imageSizeAnimation
  } = config;

  const baseSize = imageUrls.length > 0 ? particleSize : particleSize;

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
      color: backgroundColor || '#000000'
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
        value: particleColor || '#ffffff'
      },
      shape: imageUrls.length > 0 ? {
        type: "image",
        image: imageUrls.map(url => ({
          src: url,
          width: baseSize,
          height: baseSize
        }))[Math.floor(Math.random() * imageUrls.length)]
      } : {
        type: "circle",
        stroke: {
          width: 0,
          color: particleColor || '#ffffff'
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
        color: lineColor || '#ffffff',
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
