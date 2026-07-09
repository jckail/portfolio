import { useUrlParamState } from '../../../../../shared/hooks/use-url-param-state';

/** Contact-modal visibility, mirrored into the ?contact=open URL parameter. */
export const useContact = () => {
  const [value, setValue] = useUrlParamState('contact');

  return {
    selectedContact: value === 'open',
    setSelectedContact: (open: boolean) => setValue(open ? 'open' : null)
  };
};
