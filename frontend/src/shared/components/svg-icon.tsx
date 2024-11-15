import React from 'react';

interface SVGIconProps extends React.SVGProps<SVGSVGElement> {
  component: React.FC<React.SVGProps<SVGSVGElement>>;
}

// List of valid SVG attributes we want to allow
const validSvgProps = new Set([
  'width',
  'height',
  'viewBox',
  'className',
  'style',
  'fill',
  'stroke',
  'strokeWidth',
  'role',
  'aria-hidden',
  'xmlns',
  'color'
]);

const SVGIcon: React.FC<SVGIconProps> = ({ component: IconComponent, ...allProps }) => {
  // Filter to only include valid SVG props
  const validProps = Object.entries(allProps).reduce((acc, [key, value]) => {
    if (validSvgProps.has(key)) {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, any>);

  // Ensure basic accessibility and sizing props are set
  const finalProps: React.SVGProps<SVGSVGElement> = {
    width: '24',
    height: '24',
    role: 'img',
    'aria-hidden': true,
    ...validProps
  };

  return <IconComponent {...finalProps} />;
};

export default SVGIcon;
