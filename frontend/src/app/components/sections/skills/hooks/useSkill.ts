import { useUrlParamState } from '../../../../../shared/hooks/use-url-param-state';

/** Selected skill key, mirrored into the ?skill= URL parameter. */
export const useSkill = () => {
  const [selectedSkill, setSelectedSkill] = useUrlParamState('skill');

  return {
    selectedSkill,
    setSelectedSkill
  };
};
