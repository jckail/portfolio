import React, { lazy, Suspense } from 'react';

/**
 * Names served from the inline SVG set in ./skill-icon-set (kept in sync by
 * SkillIcon.test.tsx). Anything else falls back to /images/icons/<name>.
 */
export const INLINE_SKILL_ICONS: ReadonlySet<string> = new Set([
  'airbyte.svg',
  'apacheflink.svg',
  'apachepulsar.svg',
  'apacherocketmq.svg',
  'aws.svg',
  'datadog.svg',
  'django.svg',
  'duckdb.svg',
  'flask.svg',
  'jupyter.svg',
  'kafka.svg',
  'kubernetes.svg',
  'langchain.svg',
  'llamaindex.svg',
  'milvus_black.svg',
  'neo4j.svg',
  'openai.svg',
  'pandas.svg',
  'pinecone.svg',
  'prefect.svg',
  'retool.svg',
  'rust.svg',
  'scikit_learn.svg',
  'socketdotio.svg',
  'splunk.svg',
  'sqlalchemy.svg',
  'timescale.svg',
  'trino.svg',
  'trpc.svg',
  'postgresql.svg',
]);

// One chunk for the whole set, fetched the first time any inline icon renders.
const loadIconSet = () => import('./skill-icon-set');

const InlineIcon = lazy(() =>
  loadIconSet().then(({ default: set }) => ({
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
}

/**
 * Decorative: every caller renders the skill's name beside the icon, so the
 * icon carries no name of its own (a spoken "python" twice was an axe
 * image-redundant-alt hit on every chip). The aria-label prop is accepted for
 * compatibility and intentionally not forwarded.
 */
const SkillIcon: React.FC<IconProps> = ({ name, className = 'skill-icon', size = 32, 'aria-label': _label, ...props }) => {
  if (INLINE_SKILL_ICONS.has(name)) {
    return (
      <Suspense fallback={<div className={`${className} skeleton`} style={{ width: size, height: size }} />}>
        <InlineIcon
          name={name}
          width={size}
          height={size}
          className={className}
          aria-hidden="true"
          {...props}
        />
      </Suspense>
    );
  }

  return (
    <img 
      src={`/images/icons/${name}`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={className}
      loading="lazy"
      {...props}
    />
  );
};

export default SkillIcon;
