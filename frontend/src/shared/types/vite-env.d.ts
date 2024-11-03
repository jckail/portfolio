/// <reference types="vite/client" />

// Extend Vite's built-in module declarations
declare module '*.svg' {
  import type { FunctionComponent, SVGProps } from 'react';
  const SVGComponent: FunctionComponent<SVGProps<SVGSVGElement>>;
  export default SVGComponent;
}

// Environment variables
declare interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_ENVIRONMENT: 'development' | 'production' | 'test';
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}
