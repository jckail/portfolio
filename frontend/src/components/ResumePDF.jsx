import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../utils/apiUtils';
import { downloadResume } from '../utils/resumeUtils';
import { useAppLogic } from '../hooks/useAppLogic';

function ResumePDF() {
  const [pdfUrl, setPdfUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { resumeFileName } = useAppLogic();

  useEffect(() => {
    const fetchPdf = async () => {
      try {
        const apiUrl = getApiUrl();
        const fullUrl = `${apiUrl}/resume`;
        const response = await fetch(fullUrl);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching PDF:', err.message);
        setError(err.message);
        setIsLoading(false);
      }
    };

    fetchPdf();

    // Cleanup function to revoke the object URL
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, []);

  const handleDownloadClick = async () => {
    await downloadResume(resumeFileName);
  };

  if (isLoading) {
    return <div>Loading resume...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="resume-section">
      <div className="resume-pdf-container">
        <iframe
          src={pdfUrl}
          title={resumeFileName || 'ResumePDF'}
        />
      </div>
      <button onClick={handleDownloadClick} className="download-button">Download Resume</button>
    </div>
  );
}

export default ResumePDF;
