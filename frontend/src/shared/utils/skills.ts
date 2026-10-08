import { getOwn } from './lookup';

import type { Skill, SkillsData } from '../../types/skills';

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
  dag: 'DAG', e2e: 'E2E', elk: 'ELK', elt: 'ELT', etl: 'ETL', gpt: 'GPT', gcp: 'GCP', hdfs: 'HDFS',
  iaas: 'IaaS', iac: 'IaC', json: 'JSON', jvm: 'JVM', llm: 'LLM', ml: 'ML', mlops: 'MLOps',
  mvc: 'MVC', nlp: 'NLP', nosql: 'NoSQL', npm: 'npm', olap: 'OLAP', orm: 'ORM', os: 'OS',
  paas: 'PaaS', rag: 'RAG', rdbms: 'RDBMS', rest: 'REST', saas: 'SaaS', spa: 'SPA',
  sql: 'SQL', ui: 'UI', ux: 'UX', w3c: 'W3C', wsgi: 'WSGI', openapi: 'OpenAPI',
  postgresql: 'PostgreSQL', github: 'GitHub', javascript: 'JavaScript',
};
const TAG_PHRASES: Record<string, string> = { 'ci-cd': 'CI/CD', 'ui-ux': 'UI/UX', 'next.js': 'Next.js' };

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

// ---------------------------------------------------------------------------
// Skill relationships. Everything below is derived from the data payloads at
// call time; nothing here asserts a relationship the data does not contain.
// ---------------------------------------------------------------------------

/**
 * Resolve a tech-stack tag to a skill key: first by display name (the same
 * rule the tag chips use), then as the key itself with hyphens as underscores
 * ("agent-harnesses" -> agent_harnesses).
 */
export function resolveTagToSkillKey(skillsData: SkillsData, tag: string): string | undefined {
  const byName = findSkillKey(skillsData, tag);
  if (byName) return byName;
  const asKey = tag.trim().toLowerCase().replace(/[-\s]+/g, '_');
  return Object.hasOwn(skillsData, asKey) ? asKey : undefined;
}

export interface SkillRole {
  key: string;
  company: string;
  title: string;
  date: string;
}

export interface SkillProject {
  key: string;
  title: string;
}

export interface SkillUsage {
  roles: SkillRole[];
  projects: SkillProject[];
}

interface UsageSources {
  experienceData?: Record<string, { company: string; title: string; date: string; tech_stack?: string[] }> | null;
  projectsData?: Record<string, { title: string; tech_stack?: string[] }> | null;
}

/**
 * Roles whose tech_stack and projects whose tech_stack name this skill, in
 * data order (experience.json lists the newest role first).
 */
export function skillUsage(skillsData: SkillsData, skillKey: string, sources: UsageSources): SkillUsage {
  const uses = (stack: string[] | undefined) =>
    (stack ?? []).some(tag => resolveTagToSkillKey(skillsData, tag) === skillKey);

  const roles = Object.entries(sources.experienceData ?? {})
    .filter(([, role]) => uses(role.tech_stack))
    .map(([key, role]) => ({ key, company: role.company, title: role.title, date: role.date }));
  const projects = Object.entries(sources.projectsData ?? {})
    .filter(([, project]) => uses(project.tech_stack))
    .map(([key, project]) => ({ key, title: project.title }));
  return { roles, projects };
}

/**
 * Skills the data marks as related (`related` keys that exist, minus itself
 * and duplicates). With no `related` field it falls back to the skills that
 * share the sub-category, so older payloads still get chips.
 */
export function relatedSkills(skillsData: SkillsData, skillKey: string, limit = 8): string[] {
  const skill = getOwn(skillsData, skillKey);
  if (!skill) return [];
  const explicit = Array.from(new Set(skill.related ?? [])).filter(
    key => key !== skillKey && Object.hasOwn(skillsData, key)
  );
  if (explicit.length > 0) return explicit.slice(0, limit);
  if (!skill.sub_category) return [];
  return Object.entries(skillsData)
    .filter(([key, other]) => key !== skillKey && other.sub_category === skill.sub_category)
    .map(([key]) => key)
    .slice(0, limit);
}

export interface CategoryPosition {
  category: string;
  index: number;
  total: number;
  previous?: string;
  next?: string;
}

/** Where a skill sits among its category, in the order the Skills section lists it. */
export function categoryPosition(skillsData: SkillsData, skillKey: string): CategoryPosition | undefined {
  const skill = getOwn(skillsData, skillKey);
  if (!skill) return undefined;
  const keys = Object.entries(skillsData)
    .filter(([, other]) => other.general_category === skill.general_category)
    .map(([key]) => key);
  const index = keys.indexOf(skillKey);
  return {
    category: skill.general_category,
    index,
    total: keys.length,
    previous: index > 0 ? keys[index - 1] : undefined,
    next: index < keys.length - 1 ? keys[index + 1] : undefined,
  };
}

/** Prompt the "Ask the assistant" button hands to the chat. */
export function skillChatPrompt(skill: Pick<Skill, 'display_name'>): string {
  return `Tell me about Jordan's experience with ${skill.display_name}. Where has he used it?`;
}

/** Lower-cased text the Skills search matches: name, description, category, tags, related names. */
export function skillSearchText(skillsData: SkillsData, skill: Skill): string {
  const relatedNames = (skill.related ?? [])
    .map(key => getOwn(skillsData, key)?.display_name)
    .filter((name): name is string => Boolean(name));
  return [
    skill.display_name,
    skill.description,
    skill.general_category,
    skill.sub_category ?? '',
    ...skill.tags.map(tag => formatTag(tag)),
    ...skill.tags,
    ...relatedNames,
  ]
    .join(' ')
    .toLowerCase();
}
