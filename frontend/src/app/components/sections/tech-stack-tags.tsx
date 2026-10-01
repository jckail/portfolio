import React, { memo } from 'react';

import { buttonize } from '../../../shared/utils/a11y';
import { findSkillKey, formatTag } from '../../../shared/utils/skills';

import type { SkillsData } from '../../../types/skills';

interface TechStackTagsProps {
  tags: readonly string[];
  skillsData: SkillsData;
  /** Called with the skill key of a tag that names a known skill. */
  onSelectSkill: (skillKey: string) => void;
  /** Hover on a selectable tag, e.g. to prefetch the skill modal chunk. */
  onSkillHover?: () => void;
}

/**
 * Tech-stack chips shared by the experience timeline and the experience and
 * project modals. A tag that names a known skill becomes a keyboard-operable
 * chip that opens that skill; anything else is a plain label.
 */
export const TechStackTags: React.FC<TechStackTagsProps> = memo(
  ({ tags, skillsData, onSelectSkill, onSkillHover }) => (
    <div className="skill-tags">
      {tags.map((tag, index) => {
        const skillKey = findSkillKey(skillsData, tag);
        const label = formatTag(tag, skillsData, skillKey);
        // Index keys: tags are display strings and a stack may repeat one.
        return skillKey ? (
          <span
            key={index}
            className="skill-tag"
            onMouseEnter={onSkillHover}
            style={{ cursor: 'pointer' }}
            {...buttonize(() => onSelectSkill(skillKey))}
          >
            {label}
          </span>
        ) : (
          <span key={index} className="skill-tag">
            {label}
          </span>
        );
      })}
    </div>
  )
);
TechStackTags.displayName = 'TechStackTags';

export default TechStackTags;
