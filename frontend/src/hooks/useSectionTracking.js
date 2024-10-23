import { useRef } from 'react';
import { gaService } from '../utils/google-analytics';

export const useSectionTracking = () => {
  const lastTrackedSection = useRef(null);

  const trackSection = (newSectionId) => {
    if (newSectionId && lastTrackedSection.current !== newSectionId) {
      gaService.trackPageView(`/${newSectionId}`, newSectionId.split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '));
      lastTrackedSection.current = newSectionId;
    }
  };

  return { trackSection };
};
