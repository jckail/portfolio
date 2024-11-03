import React, { useEffect } from 'react';
import { useResumeStore } from '../stores/resume-store';

type ResumeProviderProps = {
  children: React.ReactNode;
};

export function ResumeProvider({ children }: ResumeProviderProps) {
  const { setResumeData, setError } = useResumeStore();

  useEffect(() => {
    async function fetchResumeData() {
      try {
        const response = await fetch('/api/resume');
        if (!response.ok) {
          throw new Error('Failed to fetch resume data');
        }
        const data = await response.json();
        setResumeData(data);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred');
      }
    }

    fetchResumeData();
  }, [setResumeData, setError]);

  return <>{children}</>;
}
