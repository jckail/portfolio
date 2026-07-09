import { useUrlParamState } from '../../../../../shared/hooks/use-url-param-state';

/** Selected project key, mirrored into the ?project= URL parameter. */
export const useProject = () => {
  const [selectedProject, setSelectedProject] = useUrlParamState('project');

  return {
    selectedProject,
    setSelectedProject,
  };
};
