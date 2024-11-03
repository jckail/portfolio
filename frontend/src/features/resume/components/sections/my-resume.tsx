import React from 'react';
import { useResumeStore } from '../../stores/resume-store';

export function MyResume() {
  const { handleDownload } = useResumeStore();

  return (
    <section id="my-resume" className="section">
      <div className="container">
        <h2>My Resume</h2>
        <div className="resume-content">
          <p>
            You can download my full resume in PDF format to learn more about my
            experience, skills, and qualifications.
          </p>
          <button 
            onClick={handleDownload}
            className="download-button"
          >
            Download Resume PDF
          </button>
        </div>
      </div>
    </section>
  );
}
