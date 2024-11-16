import React, { useEffect } from 'react';
import { useResume } from '../../providers/resume-provider';
import { useLoading } from '../../../shared/context/loading-context';
import '../../../styles/features/sections/resume.css';

const MyResume: React.FC = () => {
  const { handleDownload } = useResume();
  const { setComponentLoading } = useLoading();

  useEffect(() => {
    // Set initial load state to false since this component
    // doesn't need to fetch data initially
    setComponentLoading('myResume', false);
  }, [setComponentLoading]);

  const handleDownloadWithLoading = async () => {
    try {
      setComponentLoading('myResume', true);
      await handleDownload();
    } finally {
      setComponentLoading('myResume', false);
    }
  };

  return (
    <section id="resume" className="section-container">
      <div className="section-header">
        <h2>Get My Full Resume</h2>
      </div>
      <div className="section-content">
        <div className="resume-content">
          <div className="resume-icon">📄</div>
          <p>
            Download my complete resume to learn more about my experience, 
            skills, and qualifications. The PDF version includes additional 
            details about my projects and achievements.
          </p>
          <button 
            onClick={handleDownloadWithLoading}
            className="download-button"
            aria-label="Download Resume PDF"
          >
            <span className="button-content">
              <span className="button-icon">⬇️</span>
              <span className="button-text">Download Resume PDF</span>
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default MyResume;
