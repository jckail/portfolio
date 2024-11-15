import React from 'react';
import { useResume } from './resume-provider';
import '../styles/resume-pdf.css';

interface ResumePDFProps {
  className?: string;
}

const ResumePDF: React.FC<ResumePDFProps> = ({ className = '' }) => {
  const { pdfUrl, isLoading, error, resumeFileName, handleDownload } = useResume();

  if (isLoading) {
    return <div>Loading resume...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!resumeFileName) {
    return <div>Error: Resume file not found</div>;
  }

  return (
    <div className={`resume-section ${className}`.trim()}>
      <div className="resume-pdf-container">
        {pdfUrl && (
          <iframe
            src={pdfUrl}
            title={resumeFileName}
          />
        )}
      </div>
      <button onClick={handleDownload} className="download-button">
        Download Resume
      </button>
    </div>
  );
};

export default ResumePDF;
