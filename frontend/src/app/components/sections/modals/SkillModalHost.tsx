import React, { Suspense, lazy, useCallback, useState } from 'react';

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
  /**
   * Called when the visitor moves to another skill inside the dialog (related
   * chip, previous/next). The Skills section uses it to keep ?skill= in step;
   * hosts without one still navigate, the choice just stays local.
   */
  onNavigate?: (skillKey: string) => void;
}

/**
 * Lazy SkillModal for whichever section owns the selection. Renders nothing
 * unless `skillKey` names a skill that is actually in the data, so prototype
 * keys from a crafted ?skill= never mount an empty dialog.
 */
export const SkillModalHost: React.FC<SkillModalHostProps> = ({
  skillsData,
  skillKey,
  onClose,
  onNavigate,
}) => {
  // Remembers where in-dialog navigation started, so a new selection from the
  // owner (a different chip, back/forward) wins over a stale local choice.
  const [local, setLocal] = useState<{ from: string | null; key: string } | null>(null);
  const currentKey = local && local.from === skillKey ? local.key : skillKey;

  const navigate = useCallback(
    (key: string) => {
      setLocal({ from: skillKey, key });
      onNavigate?.(key);
    },
    [skillKey, onNavigate]
  );

  const skill = getOwn(skillsData, currentKey);
  if (!skillsData || !skill || !currentKey) return null;
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SkillModal
        skill={skill}
        skillKey={currentKey}
        skillsData={skillsData}
        onClose={onClose}
        onNavigate={navigate}
      />
    </Suspense>
  );
};

export default SkillModalHost;
