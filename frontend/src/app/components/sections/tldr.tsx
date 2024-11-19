import React, { useState, useEffect } from 'react';
import { AboutMe } from '../../../types/resume';
import { useLoading } from '../../../shared/context/loading-context';
import { GitHubIcon, LinkedInIcon, ResumeIcon } from '../../../shared/components/icons';
import '../../../styles/features/sections/tldr.css';

const TLDR: React.FC = () => {
  const [aboutMeData, setAboutMeData] = useState<AboutMe | null>(null);
  const [contactData, setContactData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { setComponentLoading } = useLoading();

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        setComponentLoading('tldr', true);
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
      } finally {
        if (mounted) {
          setComponentLoading('tldr', false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [setComponentLoading]);

  if (error) return <div className="error-aboutme">Error: {error}</div>;

  if (!aboutMeData || !contactData) {
    return (
      <section id="tldr" className="section-container">
        <div className="section-content">
          <div>Loading...</div>
        </div>
      </section>
    );
  }

  const handleResumeClick = () => {
    const resumeSection = document.getElementById('resume');
    if (resumeSection) {
      resumeSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="tldr" className="section-container">
      <div className="section-content">
        <div className="tldr-section">
          <h2>{aboutMeData.greeting}</h2>
          <div className="tldr-content">
            <div className="tldr-text">
              <p>{aboutMeData.description}</p>
            </div>
            <div className="headshot-container">
              <img 
                src={aboutMeData.full_portrait || "/images/headshot/headshot.jpg"}
                alt="Profile headshot"
                className="headshot"
              />
            </div>
          </div>
          <div className="brief-bio">
            <p>{aboutMeData.aidetails}</p>
            <div className="social-links">
              {contactData.github && (
                <a 
                  href={contactData.github} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="icon-link"
                  aria-label="GitHub Profile"
                >
                  <GitHubIcon />
                </a>
              )}
              {contactData.linkedin && (
                <a 
                  href={contactData.linkedin} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="icon-link"
                  aria-label="LinkedIn Profile"
                >
                  <LinkedInIcon />
                </a>
              )}
              <button 
                onClick={handleResumeClick}
                className="resume-button"
                aria-label="View Resume"
              >
                <strong>Resume</strong>
                <ResumeIcon/>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TLDR;
