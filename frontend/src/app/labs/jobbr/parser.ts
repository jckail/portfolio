import { extractSkills } from './skills';

export interface Salary {
  min: number;
  max: number;
  currency: string;
  period: string;
}

/** Fields mirror the structured JSON the Jobbr README lists (a subset, plus the skills the rules found). */
export interface ParsedJob {
  company_name: string | null;
  title: string | null;
  description: string | null;
  location: string[];
  remote: boolean;
  requirements: string[];
  nice_to_have: string[];
  benefits: string[];
  salary: Salary | null;
  years_of_experience: number | null;
  skills_required: string[];
  skills_preferred: string[];
  /** One line per rule that fired, so the result is explainable. */
  trace: string[];
}

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };

/** HTML-ish text to plain lines: block-level tags become line breaks, other tags are dropped. */
export function toLines(html: string): string[] {
  const text = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<\s*(br|\/p|\/div|\/h[1-6]|\/li|\/ul|\/ol|li|h[1-6]|p|div|ul|ol)\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(?:amp|lt|gt|quot|nbsp|#39);/g, m => ENTITIES[m]);
  return text
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

type Section = 'requirements' | 'nice_to_have' | 'benefits' | 'about';

const HEADINGS: [Section, RegExp][] = [
  ['nice_to_have', /^(nice to have|bonus points|preferred|preferred qualifications)\s*:?$/i],
  ['requirements', /^(requirements|what you'?ll need|qualifications|must haves?)\s*:?$/i],
  ['benefits', /^(benefits|perks|what we offer|perks (&|and) benefits)\s*:?$/i],
  ['about', /^(about the role|the role|overview|about this role)\s*:?$/i],
];

const SALARY_RE = /(?:salary|compensation|pay)\s*:?\s*(\$|€|£)\s?([\d,]+)(k?)\s*(?:-|–|to)\s*(?:\$|€|£)?\s?([\d,]+)(k?)(?:\s*(?:per|\/|a)\s*(year|yr|hour|hr))?/i;

function money(raw: string, k: string): number {
  const n = Number(raw.replace(/,/g, ''));
  return k ? n * 1000 : n;
}

export function parseSalary(line: string): Salary | null {
  const m = SALARY_RE.exec(line);
  if (!m) return null;
  const period = /^h/i.test(m[6] ?? '') ? 'hour' : 'year';
  return { currency: m[1], min: money(m[2], m[3]), max: money(m[4], m[5]), period };
}

export function parseYears(lines: string[]): number | null {
  for (const line of lines) {
    const m = /(\d{1,2})\s*\+?\s*(?:years?|yrs?)/i.exec(line);
    if (m) return Number(m[1]);
  }
  return null;
}

/** Transparent rule-based parser. No model is involved: every field comes from a visible rule. */
export function parseJob(raw: string): ParsedJob {
  const lines = toLines(raw);
  const trace: string[] = [];
  const job: ParsedJob = {
    company_name: null,
    title: null,
    description: null,
    location: [],
    remote: false,
    requirements: [],
    nice_to_have: [],
    benefits: [],
    salary: null,
    years_of_experience: null,
    skills_required: [],
    skills_preferred: [],
    trace,
  };

  const h1 = /<h1[^>]*>(.*?)<\/h1>/is.exec(raw);
  if (h1) {
    job.title = toLines(h1[1])[0] ?? null;
    if (job.title) trace.push('title: text of the <h1> element');
  }
  const company = /^(?:company|employer)\s*:\s*(.+)$/i;
  let section: Section | null = null;
  for (const line of lines) {
    const heading = HEADINGS.find(([, re]) => re.test(line));
    if (heading) {
      section = heading[0];
      trace.push(`section: "${line}" starts ${heading[0]}`);
      continue;
    }
    const c = company.exec(line);
    if (c) {
      job.company_name = c[1];
      trace.push('company_name: line starting "Company:"');
      section = null;
      continue;
    }
    const loc = /^location\s*:\s*(.+)$/i.exec(line);
    if (loc) {
      const remote = /\bremote\b/i.test(loc[1]);
      job.remote = remote;
      job.location = loc[1]
        .split(/\s*(?:;|\|)\s*/)
        .map(part => part.replace(/\s*\(?remote\)?\s*/i, '').trim())
        .filter(Boolean);
      trace.push(`location: line starting "Location:"${remote ? ', "remote" keyword sets remote=true' : ''}`);
      section = null;
      continue;
    }
    if (SALARY_RE.test(line)) {
      job.salary = parseSalary(line);
      trace.push('salary: "salary" label followed by a currency range');
      section = null;
      continue;
    }
    if (line === job.title) continue;
    if (section === 'requirements') job.requirements.push(line);
    else if (section === 'nice_to_have') job.nice_to_have.push(line);
    else if (section === 'benefits') job.benefits.push(line);
    else if (section === 'about' && !job.description) job.description = line;
  }
  if (job.description) trace.push('description: first line after the role heading');
  job.years_of_experience = parseYears(job.requirements);
  if (job.years_of_experience !== null) trace.push('years_of_experience: first "N years" in requirements');
  job.skills_required = extractSkills(job.requirements.join('\n'));
  job.skills_preferred = extractSkills(job.nice_to_have.join('\n')).filter(s => !job.skills_required.includes(s));
  trace.push(`skills: matched ${job.skills_required.length + job.skills_preferred.length} vocabulary terms`);
  return job;
}

export const PARSED_FIELDS: (keyof ParsedJob)[] = [
  'company_name', 'title', 'description', 'location', 'requirements', 'benefits', 'salary',
];

/** Number of the README-listed fields that came out non-empty. */
export function filledFields(job: ParsedJob): number {
  return PARSED_FIELDS.filter(f => {
    const v = job[f];
    return Array.isArray(v) ? v.length > 0 : v !== null && v !== '';
  }).length;
}
