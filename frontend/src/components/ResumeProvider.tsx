import React, { createContext, useContext, useEffect, useState } from 'react';
import { ResumeData } from '../features/resume/types';

interface ResumeContextType {
  resumeData: ResumeData | null;
  error: string | null;
  isLoading: boolean;
  handleDownload: () => Promise<void>;
}

const ResumeContext = createContext<ResumeContextType>({
  resumeData: null,
  error: null,
  isLoading: true,
  handleDownload: async () => {},
});

export const useResume = () => useContext(ResumeContext);

interface ResumeProviderProps {
  children: React.ReactNode;
}

export const ResumeProvider: React.FC<ResumeProviderProps> = ({ children }) => {
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchResumeData = async () => {
    try {
      const response = await fetch('/api/resume_data');
      if (!response.ok) {
        throw new Error('Failed to fetch resume data');
      }
      const data = await response.json();
      setResumeData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching resume data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setResumeData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch('/api/resume');
      if (!response.ok) {
        throw new Error('Failed to download resume');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resume.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading resume:', err);
      setError(err instanceof Error ? err.message : 'Failed to download resume');
    }
  };

  useEffect(() => {
    fetchResumeData();
  }, []);

  return (
    <ResumeContext.Provider
      value={{
        resumeData,
        error,
        isLoading,
        handleDownload,
      }}
    >
      {children}
    </ResumeContext.Provider>
  );
};

export default ResumeProvider;
