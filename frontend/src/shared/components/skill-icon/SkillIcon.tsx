import React, { lazy, Suspense } from 'react';

// Lazy load SVG components
const SVG_COMPONENTS: Record<string, React.LazyExoticComponent<React.FC<React.SVGProps<SVGSVGElement>>>> = {
  'airbyte.svg': lazy(() => import('../../../assets/icons/airbyte.svg?react')),
  'apacheflink.svg': lazy(() => import('../../../assets/icons/apacheflink.svg?react')),
  'apachepulsar.svg': lazy(() => import('../../../assets/icons/apachepulsar.svg?react')),
  'apacherocketmq.svg': lazy(() => import('../../../assets/icons/apacherocketmq.svg?react')),
  'aws.svg': lazy(() => import('../../../assets/icons/aws.svg?react')),
  'datadog.svg': lazy(() => import('../../../assets/icons/datadog.svg?react')),
  'django.svg': lazy(() => import('../../../assets/icons/django.svg?react')),
  'duckdb.svg': lazy(() => import('../../../assets/icons/duckdb.svg?react')),
  'flask.svg': lazy(() => import('../../../assets/icons/flask.svg?react')),
  'jupyter.svg': lazy(() => import('../../../assets/icons/jupyter.svg?react')),
  'kafka.svg': lazy(() => import('../../../assets/icons/kafka.svg?react')),
  'kubernetes.svg': lazy(() => import('../../../assets/icons/kubernetes.svg?react')),
  'langchain.svg': lazy(() => import('../../../assets/icons/langchain.svg?react')),
  'llamaindex.svg': lazy(() => import('../../../assets/icons/llamaindex.svg?react')),
  'milvus_black.svg': lazy(() => import('../../../assets/icons/milvus_black.svg?react')),
  'neo4j.svg': lazy(() => import('../../../assets/icons/neo4j.svg?react')),
  'openai.svg': lazy(() => import('../../../assets/icons/openai.svg?react')),
  'pandas.svg': lazy(() => import('../../../assets/icons/pandas.svg?react')),
  'pinecone.svg': lazy(() => import('../../../assets/icons/pinecone.svg?react')),
  'prefect.svg': lazy(() => import('../../../assets/icons/prefect.svg?react')),
  'retool.svg': lazy(() => import('../../../assets/icons/retool.svg?react')),
  'rust.svg': lazy(() => import('../../../assets/icons/rust.svg?react')),
  'scikit_learn.svg': lazy(() => import('../../../assets/icons/scikit_learn.svg?react')),
  'socketdotio.svg': lazy(() => import('../../../assets/icons/socketdotio.svg?react')),
  'splunk.svg': lazy(() => import('../../../assets/icons/splunk.svg?react')),
  'sqlalchemy.svg': lazy(() => import('../../../assets/icons/sqlalchemy.svg?react')),
  'timescale.svg': lazy(() => import('../../../assets/icons/timescale.svg?react')),
  'trino.svg': lazy(() => import('../../../assets/icons/trino.svg?react')),
  'trpc.svg': lazy(() => import('../../../assets/icons/trpc.svg?react')),
  'postgresql.svg': lazy(() => import('../../../assets/icons/postgresql.svg?react')),
};

export interface IconProps {
  name: string;
  className?: string;
  size?: number;
  'aria-label'?: string;
}

const SkillIcon: React.FC<IconProps> = ({ name, className = 'skill-icon', size = 32, ...props }) => {
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
      src={`/images/icons/${name}`}
      alt={name.replace('.svg', '')}
      width={size}
      height={size}
      className={className}
      loading="lazy"
      {...props}
    />
  );
};

export default SkillIcon;
