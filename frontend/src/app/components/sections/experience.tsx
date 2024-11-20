import React, { useState, useEffect, lazy, Suspense } from 'react';
import '../../../styles/features/sections/experience.css';
import type { ExperienceItem } from './modals/ExperienceModal';

const ExperienceModal = lazy(() => import('./modals/ExperienceModal'));

interface ExperienceData {
  [key: string]: ExperienceItem;
}

// Cache for API data
let experienceCache: ExperienceData | null = null;
let lastFetchTime: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const Experience: React.FC = () => {
  const [experience, setExperience] = useState<ExperienceData>({});
  const [selectedExperience, setSelectedExperience] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchExperience = async () => {
      try {
        // Check cache first
        const now = Date.now();
        if (experienceCache && lastFetchTime && (now - lastFetchTime < CACHE_DURATION)) {
          setExperience(experienceCache);
          return;
        }

        const response = await fetch('/api/experience');
        if (!response.ok) {
          throw new Error('Failed to fetch experience data');
        }
        const data = await response.json();
        
        // Update cache
        experienceCache = data;
        lastFetchTime = now;

        if (mounted) {
          setExperience(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      }
    };

    fetchExperience();

    return () => {
      mounted = false;
    };
  }, []);

  if (error) return <div>Error: {error}</div>;

  if (Object.keys(experience).length === 0) {
    return (
      <section id="experience" className="section-container">
        <div className="section-content">
          <div>Loading...</div>
        </div>
      </section>
    );
  }

  return (
    <section id="experience" className="section-container">
      <div className="section-header">
        <h2>Experience</h2>
      </div>
      <div className="section-content">
        <div className="timeline">
          {Object.entries(experience).map(([key, item]) => (
            <div key={key} className="timeline-item">
              <div className="timeline-header-wrapper">
                {item.logoPath && (
                  <div 
                    className="logo-link"
                    onClick={() => setSelectedExperience(key)}
                    style={{ cursor: 'pointer' }}
                  >
                    <img 
                      src={item.logoPath} 
                      alt={`${item.company} logo`} 
                      className="company-logo"
                      loading="lazy"
                      width="64"
                      height="64"
                      decoding="async"
                    />
                  </div>
                )}
                <div className="timeline-header">
                  <h3>{item.company}</h3>
                  <h4>{item.title}</h4>
                  <div className="timeline-meta">
                    <span className="date">{item.date}</span>
                    <span className="location">{item.location}</span>
                  </div>
                </div>
              </div>
              {item.highlights && (
                <ul className="highlights">
                  {item.highlights.map((highlight, idx) => (
                    <li key={idx}>{highlight}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedExperience && experience[selectedExperience] && (
        <Suspense fallback={<div className="modal-loading">Loading...</div>}>
          <ExperienceModal
            experience={experience[selectedExperience]}
            onClose={() => setSelectedExperience(null)}
          />
        </Suspense>
      )}
    </section>
  );
};

export default Experience;
