import React, { useState, useEffect } from 'react';

function ResumePDF() {
  const [pdfUrl, setPdfUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('ResumePDF component mounted');
    const fetchPdf = async () => {
      try {
        console.log('Fetching PDF...');
        const response = await fetch('http://localhost:8080/api/resume', {
          method: 'GET',
          mode: 'cors',
          credentials: 'include',
        });
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        console.log('Blob received:', blob);
        const url = URL.createObjectURL(blob);
        console.log('Created URL:', url);
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

  console.log('Rendering ResumePDF component');
  console.log('isLoading:', isLoading);
  console.log('error:', error);
  console.log('pdfUrl:', pdfUrl);

  if (isLoading) {
    return <div>Loading resume...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="resume-pdf-container">
      <iframe
        src={pdfUrl}
        width="100%"
        height="100%"
        style={{border: 'none'}}
        title="Jordan Kail Resume"
      />
    </div>
  );
}

export default ResumePDF;
