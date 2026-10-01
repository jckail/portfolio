/** One entry of GET /api/skills (backend/app/models/skills.py SkillDetail). */
export interface Skill {
  display_name: string;
  image: string;
  professional_experience: boolean;
  years_of_experience: number;
  tags: string[];
  description: string;
  weblink: string;
  examples: Record<string, string>;
  general_category: string;
  sub_category?: string;
}

export type SkillsData = Record<string, Skill>;
