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
    bubbleSpeed = 5
  } = options;
  
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
      shape: {
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
        value: particleSize,
        random: false,
        anim: {
          enable: false,
          speed: 0.1,
          size_min: 2,
          sync: true
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
