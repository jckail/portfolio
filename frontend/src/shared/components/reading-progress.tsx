import React, { useEffect, useRef } from 'react';
import '../../styles/components/reading-progress.css';

/**
 * Thin top-of-viewport bar that tracks document scroll progress. Purely
 * decorative and outside every landmark, so it is hidden from assistive tech.
 */
export const ReadingProgress: React.FC = () => {
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      const ratio =
        scrollable <= 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / scrollable));
      // Drive the bar with a compositor-only transform instead of width
      if (barRef.current) barRef.current.style.transform = `scaleX(${ratio})`;
    };

    // At most one measurement per frame, however many scroll events fire
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  return (
    <div
      className="reading-progress"
      aria-hidden="true"
    >
      <div ref={barRef} className="reading-progress-bar" />
    </div>
  );
};

export default ReadingProgress;
