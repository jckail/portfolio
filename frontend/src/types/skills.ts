export interface Skill {
  display_name: string;
  image: string;
  professional_experience: boolean;
  years_of_experience: number;
  tags: string[];
  description: string;
  weblink: string;
  examples: Record<string, any>;
  general_category: string;
  sub_category: string;
}

export interface SkillsData {
  [key: string]: Skill;
}

export interface SkillModalProps {
  skill: Skill;
  onClose: () => void;
}

export interface IconProps {
  name: string;
  className?: string;
  size?: number;
  'aria-label'?: string;
}
