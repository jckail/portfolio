import { PRIMARY } from '../../../config/constants';
import { ParticlesConfig } from '../lib/particles/types';

const getParticlesConfig = (isDark: boolean): ParticlesConfig => {
  return {
    background: {
      color: isDark ? '#000000' : '#ffffff'
    },
    particles: {
      number: {
        value: 25,
        density: {
          enable: false,
          value_area: 800
        }
      },
      color: {
        value: PRIMARY
      },
      shape: {
        type: "circle",
        stroke: {
          width: 0,
          color: PRIMARY
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
        value: 4,
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
        distance: 225,
        color: PRIMARY,
        opacity: 1,
        width: 2
      },
      move: {
        enable: true,
        speed: 0.3,
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
          size: 8,
          duration: 2,
          opacity: 4,
          speed: 5
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

// Use the same configuration for both themes, just with different backgrounds
export const particlesConfig = {
  light: getParticlesConfig(false),
  dark: getParticlesConfig(true)
};

export default getParticlesConfig;
