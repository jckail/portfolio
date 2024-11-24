import React, { useState, useCallback } from 'react';
import { useResume } from '../../providers/resume-provider';
import { trackResumeDownload } from '../../../shared/utils/analytics';
import '../../../styles/components/sections/resume.css';
import PDFViewer from './modals/PDFViewer';

const LoadingSpinner = () => (
  <div className="loading-spinner"></div>
);

const MyResume: React.FC = () => {
  const { handleDownload, error: providerError } = useResume();
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadWithLoading = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent any default button behavior
    console.log('Download button clicked');
    
    if (!handleDownload) {
      console.error('handleDownload function is not available');
      return;
    }

    try {
      setIsDownloading(true);
      setError(null);
      console.log('Calling handleDownload...');
      await handleDownload();
      // Track successful download
      await trackResumeDownload('pdf', 'latest', 'download_button');
      console.log('handleDownload completed');
    } catch (err) {
      console.error('Download error:', err);
      setError(err instanceof Error ? err.message : 'Failed to download resume');
      // Track failed download with the same function
      await trackResumeDownload('pdf', 'latest', 'download_button_error');
    } finally {
      setIsDownloading(false);
    }
  }, [handleDownload]);

  console.log('Resume component rendered, handleDownload available:', !!handleDownload);

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
              type="button"
              style={{ cursor: 'pointer' }}
              data-action="download"
              data-label="Resume PDF"
              id="resume-download-button"
            >
              <span className="button-content">
                {isDownloading ? (
                  <LoadingSpinner />
                ) : (
                  <span className="button-text">⬇️ Download Resume PDF 📄</span>
                )}
              </span>
            </button>
            {(error || providerError) && (
              <div className="error-container">
                <p className="error-message">{error || providerError}</p>
              </div>
            )}
          </div>
          <div className="resume-pdf-container">
            <PDFViewer />
          </div>
        </div>
      </div>
    </section>
  );
};

export default MyResume;
