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
