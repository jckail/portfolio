import React, { lazy, Suspense } from 'react';

// Lazy load SVG components
const SVG_COMPONENTS: Record<string, React.LazyExoticComponent<React.FC<React.SVGProps<SVGSVGElement>>>> = {
  'github-logo.svg': lazy(() => import('../../../assets/icons/projects/github-logo.svg?react')),
  'gopilot-icon.svg': lazy(() => import('../../../assets/icons/projects/gopilot-icon.svg?react')),
  'jk-icon.svg': lazy(() => import('../../../assets/icons/projects/jk-icon.svg?react')),
  'jobbr-icon.svg': lazy(() => import('../../../assets/icons/projects/jobbr-icon.svg?react')),
  'litcrypto-icon.svg': lazy(() => import('../../../assets/icons/projects/litcrypto-icon.svg?react')),
  'playground-icon.svg': lazy(() => import('../../../assets/icons/projects/playground-icon.svg?react')),
  'super-teacher.svg': lazy(() => import('../../../assets/icons/projects/super-teacher.svg?react')),
  'techcrunch-icon.svg': lazy(() => import('../../../assets/icons/projects/techcrunch-icon.svg?react')),
  'altjobbr.svg': lazy(() => import('../../../assets/icons/projects/altjobbr.svg?react')),
  'pointup.svg': lazy(() => import('../../../assets/icons/projects/pointup.svg?react')),
};

export interface IconProps {
  name: string;
  className?: string;
  size?: number;
  'aria-label'?: string;
}

const ProjectIcon: React.FC<IconProps> = ({ name, className = 'project-icon', size = 32, ...props }) => {
  const SvgComponent = SVG_COMPONENTS[name];

  if (SvgComponent) {
    return (
      <Suspense fallback={<div className={`${className} skeleton`} style={{ width: size, height: size }} />}>
        <SvgComponent
          width={size}
          height={size}
          className={className}
          {...props}
        />
      </Suspense>
    );
  }

  return (
    <img 
      src={`/images/projects/${name}`}
      alt={name.replace('.svg', '')}
      width={size}
      height={size}
      className={className}
      loading="lazy"
      {...props}
    />
  );
};

export default ProjectIcon;
