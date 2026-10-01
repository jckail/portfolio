import { getOwn } from './lookup';

import type { SkillsData } from '../../types/skills';

// display name (lower-cased) -> skill key, built once per skills payload.
// Tags are resolved for every chip on every render of Experience, Projects
// and About, so a linear scan per tag added up.
const displayNameIndex = new WeakMap<SkillsData, Map<string, string>>();

function indexFor(skillsData: SkillsData): Map<string, string> {
  let index = displayNameIndex.get(skillsData);
  if (!index) {
    index = new Map();
    for (const [key, skill] of Object.entries(skillsData)) {
      const name = skill.display_name.toLowerCase();
      // First entry wins, matching the old Array.find order
      if (!index.has(name)) index.set(name, key);
    }
    displayNameIndex.set(skillsData, index);
  }
  return index;
}

/**
 * Resolve a tech-stack tag (display name, possibly hyphenated) to its skill
 * data key, e.g. "apache-spark" -> "apache_spark".
 */
export function findSkillKey(skillsData: SkillsData, tagName: string): string | undefined {
  return indexFor(skillsData).get(tagName.replace(/-/g, ' ').toLowerCase());
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
export function formatTag(tag: string, skillsData?: SkillsData, skillKey?: string): string {
  const key = skillKey ?? (skillsData ? findSkillKey(skillsData, tag) : undefined);
  const skill = getOwn(skillsData, key);
  if (skill) return skill.display_name;
  const phrase = getOwn(TAG_PHRASES, tag.toLowerCase());
  if (phrase) return phrase;
  return tag
    .split('-')
    .map(word => getOwn(TAG_WORDS, word.toLowerCase()) ?? word)
    .join(' ');
}
