import { useUrlParamState } from '../../../../../shared/hooks/use-url-param-state';

/** Selected experience slug, mirrored into the ?company= URL parameter. */
export const useExperience = () => {
  const [selectedExperience, setSelectedExperience] = useUrlParamState('company');

  return {
    selectedExperience,
    setSelectedExperience
  };
};
