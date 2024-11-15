import React from 'react';
import { useResume } from '../../components/resume-provider';
import '../../styles/sections/resume.css';

const MyResume: React.FC = () => {
  const { handleDownload } = useResume();

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
            onClick={handleDownload}
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
