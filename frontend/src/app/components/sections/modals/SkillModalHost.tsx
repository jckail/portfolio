import React, { Suspense, lazy } from 'react';

import { LoadingSpinner } from '../../../../shared/components/loading-spinner';
import { getOwn } from '../../../../shared/utils/lookup';

import type { SkillsData } from '../../../../types/skills';

const SkillModal = lazy(() => import('./SkillModal'));

/** Warms the SkillModal chunk, e.g. on hover over something that opens it. */
export const prefetchSkillModal = () => import('./SkillModal');

interface SkillModalHostProps {
  skillsData: SkillsData | null | undefined;
  /** Selected skill key; may come from the URL, so it is checked as an own key. */
  skillKey: string | null;
  onClose: () => void;
}

/**
 * Lazy SkillModal for whichever section owns the selection. Renders nothing
 * unless `skillKey` names a skill that is actually in the data, so prototype
 * keys from a crafted ?skill= never mount an empty dialog.
 */
export const SkillModalHost: React.FC<SkillModalHostProps> = ({ skillsData, skillKey, onClose }) => {
  const skill = getOwn(skillsData, skillKey);
  if (!skill || !skillKey) return null;
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SkillModal skill={skill} skillKey={skillKey} onClose={onClose} />
    </Suspense>
  );
};

export default SkillModalHost;
