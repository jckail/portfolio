import React, { useState, useEffect, lazy, Suspense } from 'react';
import { AboutMe } from '../../../types/resume';
import '../../../styles/features/sections/about.css';

const SocialLinks = lazy(() => import('./social-links/SocialLinks'));

interface TLDRContentProps {
  aboutMeData: AboutMe;
  contactData: any;
  onResumeClick: () => void;
}

const TLDRContent: React.FC<TLDRContentProps> = ({ aboutMeData, contactData, onResumeClick }) => (
  <div className="about-section">
    <h2>{aboutMeData.greeting}</h2>
    <div className="about-content">
      <p>{aboutMeData.description}</p>
      <div className="headshot-container">
        <img 
          src={aboutMeData.full_portrait || "/images/headshot/headshot.jpg"}
          alt="Profile headshot"
          className="headshot"
          loading="lazy"
        />
      </div>
    </div>
    <div className="brief-bio">
      <Suspense fallback={<div className="social-links-skeleton" />}>
        <SocialLinks
          github={contactData.github}
          linkedin={contactData.linkedin}
          email={contactData.email}
          onResumeClick={onResumeClick}
        />
      </Suspense>
      <p>{aboutMeData.aidetails}</p>
    </div>
  </div>
);

const TLDR: React.FC = () => {
  const [aboutMeData, setAboutMeData] = useState<AboutMe | null>(null);
  const [contactData, setContactData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        const [aboutMeResponse, contactResponse] = await Promise.all([
          fetch('/api/aboutme'),
          fetch('/api/contact')
        ]);
        
        if (!aboutMeResponse.ok || !contactResponse.ok) {
          throw new Error('Failed to fetch data');
        }
        
        const [aboutMeData, contactData] = await Promise.all([
          aboutMeResponse.json(),
          contactResponse.json()
        ]);

        if (mounted) {
          setAboutMeData(aboutMeData);
          setContactData(contactData);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, []);

  const handleResumeClick = () => {
    const resumeSection = document.getElementById('resume');
    if (resumeSection) {
      resumeSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (error) return <div className="error-aboutme">Error: {error}</div>;

  if (!aboutMeData || !contactData) {
    return (
      <section id="about" className="section-container">
        <div className="section-content">
          <div>Loading...</div>
        </div>
      </section>
    );
  }

  return (
    <section id="about" className="section-container">
      <div className="section-content">
        <Suspense fallback={<div>Loading content...</div>}>
          <TLDRContent
            aboutMeData={aboutMeData}
            contactData={contactData}
            onResumeClick={handleResumeClick}
          />
        </Suspense>
      </div>
    </section>
  );
};

export default TLDR;
