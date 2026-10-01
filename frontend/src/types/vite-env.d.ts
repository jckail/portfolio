/// <reference types="vite/client" />

// `import Icon from './x.svg?react'` (vite-plugin-svgr) yields a component.
// Plain `*.svg`, image and `?url` imports are typed by vite/client as URLs.
declare module '*.svg?react' {
  import type { FunctionComponent, SVGProps } from 'react';
  const SVGComponent: FunctionComponent<SVGProps<SVGSVGElement>>;
  export default SVGComponent;
}
