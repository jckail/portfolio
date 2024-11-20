import React, { createContext, useContext, useState, useCallback } from 'react';

interface LoadingState {
  about: boolean;
  experience: boolean;
  technicalSkills: boolean;
  projects: boolean;
  myResume: boolean;
}

interface LoadingContextType {
  loadingStates: LoadingState;
  setComponentLoading: (component: keyof LoadingState, isLoading: boolean) => void;
  isFullyLoaded: boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loadingStates, setLoadingStates] = useState<LoadingState>({
    about: false,
    experience: false,
    technicalSkills: false,
    projects: false,
    myResume: false,
  });

  const setComponentLoading = useCallback((component: keyof LoadingState, isLoading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [component]: isLoading,
    }));
  }, []);

  const isFullyLoaded = !Object.values(loadingStates).some(state => state);

  return (
    <LoadingContext.Provider value={{ loadingStates, setComponentLoading, isFullyLoaded }}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};
