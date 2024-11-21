import React, { useState, useEffect, useRef } from 'react';

const PDFViewer: React.FC = () => {
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    );

    if (iframeRef.current) {
      observer.observe(iframeRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={iframeRef} style={{ width: '100%', height: '100%' }}>
      {shouldRender && (
        <iframe
          src="/api/resume"
          className={`pdf-frame ${pdfLoaded ? 'loaded' : 'loading'}`}
          onLoad={() => setPdfLoaded(true)}
          title="Resume PDF Viewer"
          style={{ 
            width: '100%', 
            height: '100%', 
            transform: pdfLoaded ? 'scale(1)' : 'scale(0.1)', 
            transformOrigin: 'top left',
            transition: 'transform 0.3s ease-in-out'
          }}
        />
      )}
    </div>
  );
};

export default PDFViewer;
