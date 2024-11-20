import React, { useEffect, memo } from 'react';
import { useData } from '../../providers/data-provider';
import '../../../styles/features/sections/about.css';
import SocialLinks from './social-links/SocialLinks';
import { ErrorBoundary } from '../../components/error-boundary';

const LoadingSpinner = () => (
  <div className="section-loading">
    <div className="loading-spinner"></div>
  </div>
);

const TLDRContent = memo(({ 
  aboutMeData, 
  contactData, 
  onResumeClick 
}: { 
  aboutMeData: {
    greeting: string;
    description: string;
    aidetails: string;
    full_portrait: string;
  };
  contactData: {
    github: string;
    linkedin: string;
    email: string;
  };
  onResumeClick: () => void;
}) => {
  // Preload the full portrait when data is available
  useEffect(() => {
    if (aboutMeData.full_portrait) {
      const img = new Image();
      img.src = aboutMeData.full_portrait;
    }
  }, [aboutMeData.full_portrait]);

  return (
    <div className="about-section">
      <h2>{aboutMeData.greeting}</h2>
      <div className="about-content">
        <p>{aboutMeData.description}</p>
        <div className="headshot-container">
          <img 
            src={aboutMeData.full_portrait || "/images/headshot/headshot.jpg"}
            alt="Profile headshot"
            className="headshot"
            fetchPriority="high"
            loading="eager"
            width="200"
            height="200"
          />
        </div>
      </div>
      <div className="brief-bio">
        <ErrorBoundary>
          <SocialLinks
            github={contactData.github}
            linkedin={contactData.linkedin}
            email={contactData.email}
            onResumeClick={onResumeClick}
          />
        </ErrorBoundary>
        <p>{aboutMeData.aidetails}</p>
      </div>
    </div>
  );
});

const TLDR: React.FC = () => {
  const { aboutMeData, contactData, isLoading, error } = useData();

  const handleResumeClick = () => {
    const resumeSection = document.getElementById('resume');
    if (resumeSection) {
      resumeSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Start preloading the default headshot immediately
  useEffect(() => {
    const defaultImg = new Image();
    defaultImg.src = "/images/headshot/headshot.jpg";
  }, []);

  if (error) return <div className="error-aboutme">Error: {error}</div>;

  if (isLoading || !aboutMeData || !contactData) {
    return (
      <section id="about" className="section-container">
        <div className="section-content">
          <LoadingSpinner />
        </div>
      </section>
    );
  }

  return (
    <section id="about" className="section-container">
      <div className="section-content">
        <ErrorBoundary>
          <TLDRContent
            aboutMeData={aboutMeData}
            contactData={contactData}
            onResumeClick={handleResumeClick}
          />
        </ErrorBoundary>
      </div>
    </section>
  );
};

export default TLDR;
