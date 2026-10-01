import React, { useState, useEffect, useRef } from 'react';

/**
 * Inline resume preview.
 *
 * The iframe pulls the whole PDF plus the browser's viewer, so it is only
 * mounted once the visitor is actually heading for it: after they have
 * scrolled and the container comes within reach of the viewport, or straight
 * away if they press "Preview". Observing from first paint used to fire while
 * every section above was still a small spinner, loading the PDF for visitors
 * who never left the hero.
 */
const PDFViewer: React.FC = () => {
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shouldRender) return;
    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === 'undefined') return;

    let observer: IntersectionObserver | null = null;

    // Wait for a real scroll (wheel, keys, or a #resume deep link) so the
    // layout above has settled before deciding the viewer is "near".
    const startObserving = () => {
      window.removeEventListener('scroll', startObserving);
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setShouldRender(true);
            observer?.disconnect();
          }
        },
        { rootMargin: '200px 0px' }
      );
      observer.observe(container);
    };

    if (window.scrollY > 0) {
      startObserving();
    } else {
      window.addEventListener('scroll', startObserving, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', startObserving);
      observer?.disconnect();
    };
  }, [shouldRender]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      {shouldRender ? (
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
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <button
            type="button"
            className="download-button"
            onClick={() => setShouldRender(true)}
            aria-label="Preview resume PDF"
          >
            Preview resume
          </button>
        </div>
      )}
    </div>
  );
};

export default PDFViewer;
