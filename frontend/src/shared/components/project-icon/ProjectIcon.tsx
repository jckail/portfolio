import React, { lazy, Suspense } from 'react';

/**
 * Names served inline from ./project-icon-set: the icons that paint with the
 * theme's text color and so cannot be an <img>. Keep this list short; every
 * inline SVG adds its paths to the DOM.
 */
export const THEMED_PROJECT_ICONS: ReadonlySet<string> = new Set([
  'github-logo.svg',
  'jobbr-icon.svg',
  'playground-icon.svg',
  'pointup.svg',
]);

const InlineIcon = lazy(() =>
  import('./project-icon-set').then(({ default: set }) => ({
    default: ({ name, ...svgProps }: React.SVGProps<SVGSVGElement> & { name: string }) => {
      const Svg = Object.prototype.hasOwnProperty.call(set, name) ? set[name] : undefined;
      return Svg ? <Svg {...svgProps} /> : null;
    },
  }))
);

/**
 * Every other bundled project icon is a plain asset URL, rendered with <img>:
 * one DOM node per icon and no per-icon JS chunk. Vite hashes the files (so
 * they are cached as immutable /assets/) and inlines the smallest ones as
 * data: URIs, which the CSP's img-src already allows.
 */
const ICON_URLS: Record<string, string> = Object.create(null);
// Glob patterns must be literals: the exclusions repeat THEMED_PROJECT_ICONS
// (plus an unused legacy file) so those are not also bundled as URLs.
const modules = import.meta.glob<string>(
  [
    '../../../assets/icons/projects/*.svg',
    '!**/old-jk-icon.svg',
    '!**/github-logo.svg',
    '!**/jobbr-icon.svg',
    '!**/playground-icon.svg',
    '!**/pointup.svg',
  ],
  { eager: true, query: '?url', import: 'default' }
);
for (const [path, url] of Object.entries(modules)) {
  ICON_URLS[path.slice(path.lastIndexOf('/') + 1)] = url;
}

const has = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key);

/** Resolve an icon name to the URL an <img> would load (exported for tests). */
export function projectIconUrl(name: string): string {
  return has(ICON_URLS, name) ? ICON_URLS[name] : `/images/projects/${encodeURIComponent(name)}`;
}

export interface IconProps {
  name: string;
  className?: string;
  size?: number;
  'aria-label'?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}

const ProjectIcon: React.FC<IconProps> = ({
  name,
  className = 'project-icon',
  size = 32,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden,
}) => {
  if (THEMED_PROJECT_ICONS.has(name)) {
    return (
      <Suspense fallback={<div className={`${className} skeleton`} style={{ width: size, height: size }} />}>
        <InlineIcon
          name={name}
          width={size}
          height={size}
          className={className}
          aria-label={ariaLabel}
          aria-hidden={ariaHidden}
          role={ariaLabel ? 'img' : undefined}
          focusable="false"
        />
      </Suspense>
    );
  }

  // Decorative unless the caller names it: the card already carries the
  // project title as visible text.
  return (
    <img
      src={projectIconUrl(name)}
      alt={ariaLabel ?? ''}
      width={size}
      height={size}
      className={className}
      loading="lazy"
      decoding="async"
      aria-hidden={ariaHidden}
    />
  );
};

export default ProjectIcon;
