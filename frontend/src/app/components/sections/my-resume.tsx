import React, { useState } from 'react';
import { useResume } from '../../providers/resume-provider';
import '../../../styles/features/sections/resume.css';

const LoadingSpinner = () => (
  <div className="loading-spinner"></div>
);

const MyResume: React.FC = () => {
  const { handleDownload } = useResume();
  const [isDownloading, setIsDownloading] = useState(false);

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
          <div className="resume-icon">📄</div>
          <p>
            Download a 1 page PDF version of my resume that includes a summary of
             my experience, projects, and achievements.
          </p>
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
                <>
                  <span className="button-icon">⬇️</span>
                  <span className="button-text">Download Resume PDF</span>
                </>
              )}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default MyResume;
