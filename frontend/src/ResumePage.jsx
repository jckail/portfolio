import React, { useState, useEffect } from 'react';

function ResumePage() {
  const [pdfUrl, setPdfUrl] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    setPdfUrl(`${apiUrl}/api/download_resume`);
  }, []);

  const handleError = () => {
    setError('Failed to load the resume. Please try again later.');
  };

  return (
    <div className="resume-page" style={{ height: 'calc(100vh - 60px)', padding: '20px' }}>
      {error ? (
        <div className="error-message">{error}</div>
      ) : (
        <iframe
          src={pdfUrl}
          width="100%"
          height="100%"
          style={{ border: 'none' }}
          title="Resume PDF"
          onError={handleError}
        />
      )}
    </div>
  );
}

export default ResumePage;
