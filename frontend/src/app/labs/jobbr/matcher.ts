import { extractSkills } from './skills';

import type { ParsedJob } from './parser';

export interface Weights {
  required: number;
  preferred: number;
  experience: number;
  location: number;
}

export const DEFAULT_WEIGHTS: Weights = { required: 50, preferred: 20, experience: 15, location: 15 };

export interface ResumeProfile {
  skills: string[];
  years: number | null;
  text: string;
}

export interface MatchResult {
  /** 0 to 100, or null when the weights are all zero. */
  score: number | null;
  matched: string[];
  missing: string[];
  preferredMatched: string[];
  preferredMissing: string[];
  parts: { key: keyof Weights; label: string; fit: number; weight: number; note: string }[];
}

export function readResume(text: string): ResumeProfile {
  const years = [...text.matchAll(/(\d{1,2})\s*\+?\s*(?:years?|yrs?)/gi)].map(m => Number(m[1]));
  return { skills: extractSkills(text), years: years.length ? Math.max(...years) : null, text: text.toLowerCase() };
}

const ratio = (hit: number, total: number) => (total === 0 ? 1 : hit / total);

/** Deterministic weighted score: sum(weight * fit) / sum(weights). Each fit is in [0, 1]. */
export function scoreJob(job: ParsedJob, resume: ResumeProfile, weights: Weights): MatchResult {
  const has = new Set(resume.skills);
  const matched = job.skills_required.filter(s => has.has(s));
  const missing = job.skills_required.filter(s => !has.has(s));
  const preferredMatched = job.skills_preferred.filter(s => has.has(s));
  const preferredMissing = job.skills_preferred.filter(s => !has.has(s));

  const expFit =
    job.years_of_experience === null ? 1 : Math.min(1, (resume.years ?? 0) / Math.max(1, job.years_of_experience));
  const inCity = job.location.some(l => resume.text.includes(l.split(',')[0].trim().toLowerCase()));
  const locFit = job.remote || inCity ? 1 : 0;

  const parts: MatchResult['parts'] = [
    { key: 'required', label: 'Required skills', fit: ratio(matched.length, job.skills_required.length), weight: weights.required,
      note: `${matched.length} of ${job.skills_required.length} found in the resume` },
    { key: 'preferred', label: 'Nice-to-have skills', fit: ratio(preferredMatched.length, job.skills_preferred.length), weight: weights.preferred,
      note: `${preferredMatched.length} of ${job.skills_preferred.length} found` },
    { key: 'experience', label: 'Experience', fit: expFit, weight: weights.experience,
      note: job.years_of_experience === null ? 'no years requirement stated' : `needs ${job.years_of_experience}, resume states ${resume.years ?? 'none'}` },
    { key: 'location', label: 'Location', fit: locFit, weight: weights.location,
      note: job.remote ? 'remote role' : inCity ? 'city named in the resume' : 'city not named in the resume' },
  ];
  const total = parts.reduce((sum, p) => sum + p.weight, 0);
  const score = total === 0 ? null : Math.round((parts.reduce((sum, p) => sum + p.weight * p.fit, 0) / total) * 100);
  return { score, matched, missing, preferredMatched, preferredMissing, parts };
}
