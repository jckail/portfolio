import React, { lazy, Suspense } from 'react';

// Lazy load SVG components
const SVG_COMPONENTS: Record<string, React.LazyExoticComponent<React.FC<React.SVGProps<SVGSVGElement>>>> = {
  'commonspirit.svg': lazy(() => import('../../../assets/icons/companylogos/commonspirit.svg?react')),
  'deloitte.svg': lazy(() => import('../../../assets/icons/companylogos/deloitte.svg?react')),
  'meta.svg': lazy(() => import('../../../assets/icons/companylogos/meta.svg?react')),
  'prove.svg': lazy(() => import('../../../assets/icons/companylogos/prove.svg?react')),
  'wow.svg': lazy(() => import('../../../assets/icons/companylogos/wow.svg?react')),
  'r1.svg': lazy(() => import('../../../assets/icons/companylogos/r1.svg?react')),
};

export interface IconProps {
  name: string;
  className?: string;
  size?: number;
  'aria-label'?: string;
}

const CompanyLogo: React.FC<IconProps> = ({ name, className = 'project-icon', size = 32, ...props }) => {
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

export default CompanyLogo;
