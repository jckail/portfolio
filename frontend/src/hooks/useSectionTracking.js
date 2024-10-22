import { useRef } from 'react';
import { trackSectionView } from '../utils/google-analytics';

export const useSectionTracking = () => {
  const lastTrackedSection = useRef(null);

  const trackSection = (newSectionId) => {
    if (newSectionId && lastTrackedSection.current !== newSectionId) {
      trackSectionView(newSectionId);
      lastTrackedSection.current = newSectionId;
    }
  };

  return { trackSection };
};
