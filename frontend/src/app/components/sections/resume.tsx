import React, { useState } from 'react';
import { useResume } from '../../providers/resume-provider';
import '../../../styles/components/sections/resume.css';
import PDFViewer from './modals/PDFViewer';

const LoadingSpinner = () => (
  <div className="loading-spinner"></div>
);

const MyResume: React.FC = () => {
  const { handleDownload } = useResume();
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadWithLoading = async () => {
    try {
      setIsDownloading(true);
      await handleDownload();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <section id="resume" className="section-container">
      <div className="section-header">
        <h2>My Resume</h2>
      </div>
      <div className="section-content">
        <div className="resume-content">
          <div className="resume-icon">
            <button 
              onClick={handleDownloadWithLoading}
              className="download-button"
              aria-label="Download Resume PDF"
              disabled={isDownloading}
            >
              <span className="button-content">
                {isDownloading ? (
                  <LoadingSpinner />
                ) : (
                  <span className="button-text">⬇️ Download Resume PDF 📄</span>
                )}
              </span>
            </button>
          </div>
          <div className="resume-pdf-container">
            {error && (
              <div className="error-container">
                <p className="error-message">{error}</p>
              </div>
            )}
            <PDFViewer />
          </div>
        </div>
      </div>
    </section>
  );
};

export default MyResume;
