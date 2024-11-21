import React, { useState } from 'react';
import { useResume } from '../../providers/resume-provider';
import '../../../styles/features/sections/resume.css';

const LoadingSpinner = () => (
  <div className="loading-spinner"></div>
);

const MyResume: React.FC = () => {
  const { handleDownload } = useResume();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadWithLoading = async () => {
    try {
      setIsDownloading(true);
      await handleDownload();
    } finally {
      setIsDownloading(false);
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setError('Failed to load PDF. Please ensure the server is running and the PDF is available.');
    setIsLoading(false);
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
            {isLoading && (
              <div className="loading-container">
                <LoadingSpinner />
              </div>
            )}
            
            {error && (
              <div className="error-container">
                <p className="error-message">{error}</p>
              </div>
            )}

            <iframe
              src="/api/resume"
              className={`pdf-frame ${isLoading ? 'hidden' : 'block'}`}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              title="Resume PDF Viewer"
              
            />
            
          </div>
        </div>
      </div>
    </section>
  );
};

export default MyResume;
