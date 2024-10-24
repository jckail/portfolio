import React, { createContext, useContext, useState, useEffect } from 'react';

const ResumeContext = createContext();

export const useResume = () => {
  const context = useContext(ResumeContext);
  if (!context) {
    throw new Error('useResume must be used within a ResumeProvider');
  }
  return context;
};

export function ResumeProvider({ children }) {
  const [resumeData, setResumeData] = useState(null);
  const [resumeFileName, setResumeFileName] = useState('default_resume.pdf');
  const [pdfUrl, setPdfUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch resume data
  useEffect(() => {
    const fetchResumeData = async () => {
      try {
        const response = await fetch('/api/resume_data');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setResumeData(data);
      } catch (error) {
        console.error('Error fetching resume data:', error);
        setError(error.message);
      }
    };

    fetchResumeData();
  }, []);

  // Fetch resume filename
  useEffect(() => {
    const fetchResumeFileName = async () => {
      try {
        const response = await fetch('/api/resume_file_name');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setResumeFileName(data.resumeFileName);
      } catch (error) {
        console.error('Error fetching resume file name:', error);
        setError(error.message);
      }
    };

    fetchResumeFileName();
  }, []);

  // Fetch PDF
  useEffect(() => {
    const fetchPdf = async () => {
      try {
        const response = await fetch('/api/resume');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching PDF:', error);
        setError(error.message);
        setIsLoading(false);
      }
    };

    fetchPdf();

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, []);

  const downloadResume = async (fileName = 'default_resume.pdf') => {
    try {
      console.log('Initiating resume download...', {
        fileName
      });
      
      const downloadUrl = '/api/resume';
      console.log('Download URL:', downloadUrl);

      console.log('Making fetch request...');
      const response = await fetch(downloadUrl);
      console.log('Fetch response received:', {
        status: response.status,
        ok: response.ok,
        headers: Array.from(response.headers.entries())
      });

      if (!response.ok) {
        throw new Error(`Download failed with status: ${response.status}`);
      }

      console.log('Converting response to blob...');
      const blob = await response.blob();
      console.log('Blob created:', {
        size: blob.size,
        type: blob.type
      });

      console.log('Creating download link...');
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(blob);
      downloadLink.download = fileName;

      console.log('Triggering download...');
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(downloadLink.href);

      console.log('Resume download completed successfully.');
    } catch (error) {
      console.error('Detailed error during resume download:', {
        error,
        message: error.message,
        name: error.name,
        stack: error.stack,
        type: error instanceof TypeError ? 'TypeError (possible network/CORS issue)' : 'Other error'
      });
      throw error;
    }
  };

  const handleDownload = async () => {
    await downloadResume(resumeFileName);
  };

  const value = {
    resumeData,
    resumeFileName,
    pdfUrl,
    isLoading,
    error,
    handleDownload
  };

  return (
    <ResumeContext.Provider value={value}>
      {children}
    </ResumeContext.Provider>
  );
}
