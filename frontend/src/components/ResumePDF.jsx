import React from 'react';
import { useResume } from './ResumeProvider';

function ResumePDF() {
  const { pdfUrl, isLoading, error, resumeFileName, handleDownload } = useResume();

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
      <button onClick={handleDownload} className="download-button">Download Resume</button>
    </div>
  );
}

export default ResumePDF;
