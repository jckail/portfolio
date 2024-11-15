import React, { useState, useEffect } from 'react';
import { AboutMe } from '../../types';
import '../../styles/sections/tldr.css';

const TLDR: React.FC = () => {
  const [aboutMeData, setAboutMeData] = useState<AboutMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAboutMeData = async () => {
      try {
        const response = await fetch('/api/aboutme');
        if (!response.ok) {
          throw new Error('Failed to fetch contact data');
        }
        const data = await response.json();
        setAboutMeData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAboutMeData();
  }, []);

  if (loading) return <div className="loading-aboutme">Loading aboutme...</div>;
  if (error) return <div className="error-aboutme">Error: {error}</div>;



  if (!aboutMeData) {
    return (
      <section id="tldr" className="section-container">
        <div className="section-content">
          <div>No data available</div>
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
                src={aboutMeData.full_portrait || "/images/headshot.jpg"}
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
