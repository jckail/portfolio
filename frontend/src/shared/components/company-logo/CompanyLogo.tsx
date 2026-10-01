import React, { lazy, Suspense } from 'react';

/** Names served from ./company-logo-set; others load /images/companylogos/<name>. */
export const INLINE_COMPANY_LOGOS: ReadonlySet<string> = new Set([
  'commonspirit.svg',
  'deloitte.svg',
  'meta.svg',
  'prove.svg',
  'together.svg',
  'wow.svg',
  'r1.svg',
]);

/** Logos that are a symbol only (no wordmark), so they get a tile fitted to them. */
const MARK_ONLY_COMPANY_LOGOS: ReadonlySet<string> = new Set(['together.svg']);

export const isMarkOnlyLogo = (name: string): boolean => MARK_ONLY_COMPANY_LOGOS.has(name);

const InlineLogo = lazy(() =>
  import('./company-logo-set').then(({ default: set }) => ({
    default: ({ name, ...svgProps }: React.SVGProps<SVGSVGElement> & { name: string }) => {
      const Svg = set[name];
      return Svg ? <Svg {...svgProps} /> : null;
    },
  }))
);

export interface IconProps {
  name: string;
  className?: string;
  size?: number;
  'aria-label'?: string;
  /** Decorative use: hide from assistive tech (the parent supplies the name). */
  'aria-hidden'?: boolean;
}

const CompanyLogo: React.FC<IconProps> = ({ name, className = 'company-logo', size = 32, ...props }) => {
  if (INLINE_COMPANY_LOGOS.has(name)) {
    return (
      <Suspense fallback={<div className={`${className} company-logo`} style={{ width: size, height: size }} />}>
        <InlineLogo
          name={name}
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
      src={`/images/companylogos/${name}`}
      alt={props['aria-hidden'] ? '' : name.replace('.svg', '')}
      width={size}
      height={size}
      className={className}
      loading="lazy"
      {...props}
    />
  );
};

export default CompanyLogo;
