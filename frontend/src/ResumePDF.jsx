import React from 'react';

function ResumePDF() {
  return (
    <div className="resume-pdf-container">
      <iframe
        src="/JordanKailResume.pdf"
        width="100%"
        height="100%"
        style={{border: 'none'}}
        title="Jordan Kail Resume"
      />
    </div>
  );
}

export default ResumePDF;
