export interface Project {
  title: string;
  description: string;
  description_detail: string;
  link: string;
  link2?: string;
  logoPath?: string;
  tech_stack?: string[];
  last_commit?: string;
}

export type ProjectsData = Record<string, Project>;

export interface Contact {
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  website: string;
  location: string;
  country: string;
  github: string;
  linkedin: string;
}

export interface AboutMe {
  greeting: string;
  description: string;
  aidetails: string;
  brief_bio: string;
  full_portrait: string;
  primary_skills: string[];
}

/** One entry of GET /api/experience (backend/app/models/experience.py). */
export interface ExperienceItem {
  company: string;
  title: string;
  date: string;
  location: string;
  highlights: string[];
  link: string;
  logoPath: string;
  company_description: string;
  tech_stack: string[];
  more_highlights: string[];
}

export type ExperienceData = Record<string, ExperienceItem>;
