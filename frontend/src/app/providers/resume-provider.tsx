import React, { createContext, useContext, useEffect, useState } from 'react';

interface ResumeContextType {
  error: string | null;
  isLoading: boolean;
  pdfUrl: string | null;
  resumeFileName: string | null;
  handleDownload: () => Promise<void>;
}

const ResumeContext = createContext<ResumeContextType>({
  error: null,
  isLoading: true,
  pdfUrl: null,
  resumeFileName: null,
  handleDownload: async () => {},
});

export const useResume = () => useContext(ResumeContext);

interface ResumeProviderProps {
  children: React.ReactNode;
}

export const ResumeProvider: React.FC<ResumeProviderProps> = ({ children }) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);

  const fetchResumeFileName = async () => {
    try {
      const response = await fetch('/api/resume_file_name');
      if (!response.ok) {
        throw new Error('Failed to fetch resume filename');
      }
      const data = await response.json();
      setResumeFileName(data.resumeFileName);
    } catch (err) {
      console.error('Error fetching resume filename:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch resume filename');
    }
  };


  const handleDownload = async () => {
    if (!resumeFileName) {
      setError('Resume filename not available');
      return;
    }

    try {
      const response = await fetch('/api/resume');
      if (!response.ok) {
        throw new Error('Failed to download resume');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setPdfUrl(url);
      const a = document.createElement('a');
      a.href = url;
      a.download = resumeFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading resume:', err);
      setError(err instanceof Error ? err.message : 'Failed to download resume');
    }
  };

  useEffect(() => {
    Promise.all([ fetchResumeFileName()]);
  }, []);

  // Cleanup PDF URL when component unmounts
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  return (
    <ResumeContext.Provider
      value={{
        
        error,
        isLoading,
        pdfUrl,
        resumeFileName,
        handleDownload,
      }}
    >
      {children}
    </ResumeContext.Provider>
  );
};

export default ResumeProvider;
