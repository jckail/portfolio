/// <reference types="vite/client" />

declare module '*.svg' {
  import type { FunctionComponent, SVGProps } from 'react';
  const SVGComponent: FunctionComponent<SVGProps<SVGSVGElement>>;
  export default SVGComponent;
}

// These declarations extend Vite's built-in declarations
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.webp';
