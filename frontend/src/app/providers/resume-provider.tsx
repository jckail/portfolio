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

// Export the provider component
export const ResumeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);

  const fetchResumeFileName = async () => {
    try {
      console.log('Fetching resume filename...');
      const response = await fetch('/api/resume_file_name');
      console.log('Resume filename response:', response);
      if (!response.ok) {
        throw new Error(`Failed to fetch resume filename: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Resume filename data:', data);
      setResumeFileName(data.resumeFileName);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching resume filename:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch resume filename');
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    console.log('Starting download process...');
    if (!resumeFileName) {
      const error = 'Resume filename not available';
      console.error(error);
      setError(error);
      return;
    }

    try {
      setError(null);
      console.log('Fetching resume PDF...');
      const response = await fetch('/api/resume', {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
      });

      console.log('Resume PDF response:', response);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to download resume: ${errorText}`);
      }

      const blob = await response.blob();
      console.log('PDF blob received, size:', blob.size);
      const url = window.URL.createObjectURL(blob);
      
      console.log('Creating download link...');
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = resumeFileName;
      
      console.log('Appending link to document...');
      document.body.appendChild(a);
      
      console.log('Triggering download...');
      a.click();
      
      console.log('Cleaning up...');
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      console.log('Download process complete');
      setPdfUrl(url);
    } catch (err) {
      console.error('Error in download process:', err);
      setError(err instanceof Error ? err.message : 'Failed to download resume');
    }
  };

  useEffect(() => {
    console.log('ResumeProvider mounted, fetching filename...');
    fetchResumeFileName();
  }, []);

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        console.log('Cleaning up PDF URL on unmount');
        window.URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const value = {
    error,
    isLoading,
    pdfUrl,
    resumeFileName,
    handleDownload,
  };

  return <ResumeContext.Provider value={value}>{children}</ResumeContext.Provider>;
};

// Export the hook separately
export function useResume() {
  const context = useContext(ResumeContext);
  if (context === undefined) {
    throw new Error('useResume must be used within a ResumeProvider');
  }
  return context;
}
