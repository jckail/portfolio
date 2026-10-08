export interface Project {
  status?: string;
  contribution?: string;
  evidence?: string;
  title: string;
  description: string;
  description_detail: string;
  link: string;
  link2?: string;
  link2_label?: string;
  logoPath?: string;
  tech_stack?: string[];
  last_commit?: string;
  link_label?: string;
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
  /** Absent for entries with no company, such as a career break. */
  link?: string | null;
  logoPath?: string | null;
  company_description: string;
  tech_stack?: string[];
  more_highlights: string[];
  /** Title the ATS resume uses instead of `title` (the site ignores it). */
  resume_title?: string | null;
  /** Optional gallery shown in the role dialog; empty or absent renders nothing. */
  photos?: ExperiencePhoto[];
}

export interface ExperiencePhoto {
  /** Site-relative path under frontend/public/images/. */
  src: string;
  alt: string;
  caption?: string | null;
}

export type ExperienceData = Record<string, ExperienceItem>;
