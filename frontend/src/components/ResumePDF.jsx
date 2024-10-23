import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../utils/apiUtils';
import { downloadResume } from '../utils/resumeUtils';
import { useAppLogic } from '../hooks/useAppLogic';

function ResumePDF() {
  const [pdfUrl, setPdfUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { resumeFileName } = useAppLogic();

  console.log('ResumePDF component rendered with resumeFileName:', resumeFileName);

  useEffect(() => {
    const fetchPdf = async () => {
      try {
        console.log('Fetching PDF - Starting process');
        const apiUrl = getApiUrl();
        const fullUrl = `${apiUrl}/resume`;
        console.log('Fetching PDF from URL:', fullUrl);

        const response = await fetch(fullUrl);
        console.log('PDF fetch response status:', response.status);
        console.log('PDF fetch response headers:', JSON.stringify(Array.from(response.headers.entries())));

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        console.log('PDF blob received, size:', blob.size, 'type:', blob.type);

        const url = URL.createObjectURL(blob);
        console.log('Created object URL for PDF:', url);

        setPdfUrl(url);
        setIsLoading(false);
      } catch (err) {
        console.error('Detailed error fetching PDF:', {
          message: err.message,
          name: err.name,
          stack: err.stack,
          type: err instanceof TypeError ? 'TypeError (possible CORS/network issue)' : 'Other error'
        });
        setError(err.message);
        setIsLoading(false);
      }
    };

    console.log('PDF fetch effect triggered');
    fetchPdf();

    // Cleanup function to revoke the object URL
    return () => {
      if (pdfUrl) {
        console.log('Cleaning up - revoking object URL:', pdfUrl);
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, []);

  const handleDownloadClick = async () => {
    console.log('Download button clicked, resumeFileName:', resumeFileName);
    await downloadResume(resumeFileName);
  };

  console.log('ResumePDF render state:', {
    isLoading,
    hasError: !!error,
    hasPdfUrl: !!pdfUrl,
    resumeFileName
  });

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
