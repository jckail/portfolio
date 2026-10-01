import type { Skill } from '../../app/components/sections/modals/SkillModal';

/**
 * Resolve a tech-stack tag (display name, possibly hyphenated) to its skill
 * data key, e.g. "apache-spark" -> "apache_spark".
 */
export function findSkillKey(
  skillsData: Record<string, Skill>,
  tagName: string
): string | undefined {
  const normalized = tagName.replace(/-/g, ' ').toLowerCase();
  return Object.entries(skillsData).find(
    ([, skill]) => skill.display_name.toLowerCase() === normalized
  )?.[0];
}

// Tag words whose casing CSS `text-transform: capitalize` cannot produce.
const TAG_WORDS: Record<string, string> = {
  ai: 'AI', api: 'API', apm: 'APM', aws: 'AWS', bi: 'BI', cncf: 'CNCF', css: 'CSS',
  dag: 'DAG', e2e: 'E2E', elk: 'ELK', elt: 'ELT', etl: 'ETL', gpt: 'GPT', hdfs: 'HDFS',
  iaas: 'IaaS', iac: 'IaC', json: 'JSON', jvm: 'JVM', llm: 'LLM', ml: 'ML', mlops: 'MLOps',
  mvc: 'MVC', nlp: 'NLP', nosql: 'NoSQL', npm: 'npm', olap: 'OLAP', orm: 'ORM', os: 'OS',
  paas: 'PaaS', rag: 'RAG', rdbms: 'RDBMS', rest: 'REST', saas: 'SaaS', spa: 'SPA',
  sql: 'SQL', ui: 'UI', ux: 'UX', w3c: 'W3C', wsgi: 'WSGI', openapi: 'OpenAPI',
  postgresql: 'PostgreSQL', github: 'GitHub', javascript: 'JavaScript',
};
const TAG_PHRASES: Record<string, string> = { 'ci-cd': 'CI/CD', 'ui-ux': 'UI/UX' };

/**
 * Human label for a tech-stack or descriptor tag. A tag that names a known
 * skill shows that skill's display name ("pytorch" -> "PyTorch"); anything
 * else has hyphens spaced out and known acronyms upper-cased, leaving the
 * remaining words to CSS capitalisation.
 */
export function formatTag(
  tag: string,
  skillsData?: Record<string, Skill>,
  skillKey?: string
): string {
  const key = skillKey ?? (skillsData ? findSkillKey(skillsData, tag) : undefined);
  if (key && skillsData?.[key]) return skillsData[key].display_name;
  const lower = tag.toLowerCase();
  if (TAG_PHRASES[lower]) return TAG_PHRASES[lower];
  return tag
    .split('-')
    .map(word => TAG_WORDS[word.toLowerCase()] ?? word)
    .join(' ');
}
