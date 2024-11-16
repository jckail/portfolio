import React, { useState, useEffect } from 'react';
import { AboutMe } from '../../../types/resume';
import { useLoading } from '../../../shared/context/loading-context';
import '../../../styles/features/sections/tldr.css';

const TLDR: React.FC = () => {
  const [aboutMeData, setAboutMeData] = useState<AboutMe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { setComponentLoading } = useLoading();

  useEffect(() => {
    let mounted = true;

    const fetchAboutMeData = async () => {
      try {
        setComponentLoading('tldr', true);
        const response = await fetch('/api/aboutme');
        if (!response.ok) {
          throw new Error('Failed to fetch contact data');
        }
        const data = await response.json();
        if (mounted) {
          setAboutMeData(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      } finally {
        if (mounted) {
          setComponentLoading('tldr', false);
        }
      }
    };

    fetchAboutMeData();

    return () => {
      mounted = false;
    };
  }, [setComponentLoading]);

  if (error) return <div className="error-aboutme">Error: {error}</div>;

  if (!aboutMeData) {
    return (
      <section id="tldr" className="section-container">
        <div className="section-content">
          <div>Loading...</div>
        </div>
      </section>
    );
  }

  return (
    <section id="tldr" className="section-container">
      <div className="section-content">
        <div className="tldr-section">
          <div className="tldr-content">
            <div className="tldr-text">
              <h2>{aboutMeData.greeting}</h2>
              <p>{aboutMeData.description}</p>
              <p>{aboutMeData.aidetails}</p>
            </div>
            <div className="headshot-container">
              <img 
                src={aboutMeData.full_portrait || "/images/headshot/headshot.jpg"}
                alt="Profile headshot"
                className="headshot"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TLDR;
