import React, { useEffect, memo, useState, lazy, Suspense } from 'react';
import { useData } from '../../providers/data-provider';
import '../../../styles/components/sections/about.css';
import SocialLinks from './social-links/SocialLinks';
import { ErrorBoundary } from '../../components/error-boundary';
import SkillIcon from '../../../shared/components/skill-icon/SkillIcon';

const SkillModal = lazy(() => import('./modals/SkillModal'));

const LoadingSpinner = () => (
  <div className="section-loading">
    <div className="loading-spinner"></div>
  </div>
);

const TLDRContent = memo(({ 
  aboutMeData, 
  contactData, 
  onResumeClick,
  skillsData
}: { 
  aboutMeData: {
    greeting: string;
    description: string;
    aidetails: string;
    full_portrait: string;
    primary_skills: string[];
  };
  contactData: {
    github: string;
    linkedin: string;
    email: string;
  };
  onResumeClick: () => void;
  skillsData: any;
}) => {
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

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
        <div className="about-skill-icons">
          {aboutMeData.primary_skills.map((skillName, index) => (
            <div
              key={index}
              className="about-skill-item"
              onClick={() => setSelectedSkill(skillName.toLowerCase())}
              style={{ '--item-index': index } as React.CSSProperties}
            >
              <div className="about-skill-icon-container">
                <div className="icon-wrapper">
                  <SkillIcon
                    name={`${skillName.toLowerCase()}.svg`}
                    className="about-skill-icon"
                    size={32}
                    aria-label={skillName}
                  />
                </div>
                <span className="about-skill-name">{skillName}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="headshot-container">
          <img 
            src={aboutMeData.full_portrait || "/images/headshot/headshot.jpg"}
            alt="Profile headshot"
            className="headshot"
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

      {selectedSkill && skillsData && skillsData[selectedSkill] && (
        <Suspense fallback={<LoadingSpinner />}>
          <SkillModal
            skill={skillsData[selectedSkill]}
            onClose={() => setSelectedSkill(null)}
          />
        </Suspense>
      )}
    </div>
  );
});

const TLDR: React.FC = () => {
  const { aboutMeData, contactData, skillsData, isLoading, error } = useData();

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

  if (isLoading || !aboutMeData || !contactData || !skillsData) {
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
            skillsData={skillsData}
            onResumeClick={handleResumeClick}
          />
        </ErrorBoundary>
      </div>
    </section>
  );
};

export default TLDR;
