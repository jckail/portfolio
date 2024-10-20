import React, { useState, useEffect } from 'react';
import { getApiUrl, downloadResume, fetchResumeName } from '../helpers/utils';

function ResumePDF() {
  const [pdfUrl, setPdfUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const fileName = fetchResumeName();

  useEffect(() => {
    const fetchPdf = async () => {
      try {
        const apiUrl = getApiUrl();
        const fullUrl = `${apiUrl}/api/resume`;
        const response = await fetch(fullUrl, {
          method: 'GET',
          mode: 'cors',
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching PDF:', err);
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
          title={fileName}
        />
      </div>
      <button onClick={downloadResume} className="download-button">Download Resume</button>
    </div>
  );
}

export default ResumePDF;
