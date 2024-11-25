import React, { useEffect, memo, useState, lazy, Suspense } from 'react';
import { useData } from '../../providers/data-provider';
import { scrollToSection } from '../../../shared/utils/scroll-utils';
import '../../../styles/components/sections/about.css';
import SocialLinks from './social-links/SocialLinks';
import { ErrorBoundary } from '../../components/error-boundary';
import SkillIcon from '../../../shared/components/skill-icon/SkillIcon';

const SkillModal = lazy(() => import('./modals/SkillModal'));
const ContactModal = lazy(() => import('./modals/ContactModal'));

const LoadingSpinner = () => (
  <div className="section-loading">
    <div className="loading-spinner"></div>
  </div>
);

const TLDRContent = memo(({ 
  aboutMeData, 
  contactData, 
  onResumeClick,
  skillsData,
  onContactSelect
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
    phone: string;
    location: string;
    country: string;
  };
  onResumeClick: () => void;
  skillsData: any;
  onContactSelect: () => void;
}) => {
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  return (
    <div className="about-section">
      <h2>{aboutMeData.greeting}</h2>
      <div className="about-content">
        <p>{aboutMeData.description}</p>

        <div className="headshot-container">
          <img 
            src={aboutMeData.full_portrait}
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
            onContactSelect={onContactSelect}
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
  const [selectedContact, setSelectedContact] = useState<boolean>(false);

  const handleResumeClick = () => {
    scrollToSection('resume');
  };

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
            onContactSelect={() => setSelectedContact(true)}
          />
        </ErrorBoundary>
      </div>

      {selectedContact && (
        <Suspense fallback={<LoadingSpinner />}>
          <ContactModal
            email={contactData.email}
            phone={contactData.phone}
            location={contactData.location}
            country={contactData.country}
            onClose={() => setSelectedContact(false)}
          />
        </Suspense>
      )}
    </section>
  );
};

export default TLDR;
