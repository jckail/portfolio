export interface ParticleImage {
  src: string;
  width: number;
  height: number;
}

export interface ParticleShape {
  type: string;
  stroke?: {
    width: number;
    color: string | string[];
  };
  image?: ParticleImage;
}

export interface ParticleOpacity {
  value: number;
  random: boolean;
  anim?: {
    enable: boolean;
    speed: number;
    opacity_min: number;
    sync: boolean;
  };
}

export interface ParticleSize {
  value: number;
  random: boolean;
  anim?: {
    enable: boolean;
    speed: number;
    size_min: number;
    sync: boolean;
  };
}

export interface ParticleColor {
  value: string | string[];
}

export interface ParticleConfig {
  backgroundColor?: string;
  particleColor?: string | string[];
  lineColor?: string;
  particleCount?: number;
  particleSize?: number;
  lineDistance?: number;
  lineWidth?: number;
  moveSpeed?: number;
  bubbleSize?: number;
  bubbleSpeed?: number;
  imageUrls?: string[];  // Updated to support multiple image URLs
  imageSizeAnimation?: {
    enable?: boolean;
    speed?: number;
    minSize?: number;
    sync?: boolean;
  };
}

export interface Particle {
  color?: ParticleColor;
  number?: {
    value: number;
    density: {
      enable: boolean;
      value_area: number;
    };
  };
  shape?: ParticleShape;
  opacity?: ParticleOpacity;
  size?: ParticleSize;
}

export interface ParticlesConfig {
  background?: {
    color: string;
    image?: string;
    position?: string;
    repeat?: string;
    size?: string;
  };
  particles: {
    number: Particle["number"];
    color: Particle["color"];
    shape?: Particle["shape"];
    opacity?: Particle["opacity"];
    size: Particle["size"];
    line_linked: {
      enable: boolean;
      distance: number;
      color: string;
      opacity: number;
      width: number;
      shadow?: {
        enable: boolean;
        color: string;
        blur: number;
      };
    };
    move: {
      enable: boolean;
      speed: number;
      direction: string;
      random: boolean;
      straight: boolean;
      out_mode: string;
      bounce: boolean;
      attract?: {
        enable: boolean;
        rotateX: number;
        rotateY: number;
      };
    };
  };
  interactivity: {
    detect_on: string;
    events: {
      onhover: {
        enable: boolean;
        mode: string;
      };
      onclick: {
        enable: boolean;
        mode: string;
      };
      resize: boolean;
    };
    modes: {
      grab?: {
        distance: number;
        line_linked: {
          opacity: number;
        };
      };
      bubble?: {
        distance: number;
        size: number;
        duration: number;
        opacity: number;
        speed: number;
      };
      repulse?: {
        distance: number;
        duration: number;
      };
      push?: {
        particles_nb: number;
      };
      remove?: {
        particles_nb: number;
      };
    };
  };
  retina_detect: boolean;
}
