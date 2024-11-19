import React, { lazy, Suspense } from 'react';

const GitHubIcon = lazy(() => import('../../../../shared/components/icons/github-icon'));
const LinkedInIcon = lazy(() => import('../../../../shared/components/icons/linkedin-icon'));
const EmailIcon = lazy(() => import('../../../../shared/components/icons/email-icon'));
const ResumeIcon = lazy(() => import('../../../../shared/components/icons/resume-icon'));

interface SocialLinksProps {
  github?: string;
  linkedin?: string;
  email?: string;
  onResumeClick: () => void;
}

const IconFallback = () => <div className="icon-skeleton" style={{ width: 24, height: 24 }} />;

const SocialLinks: React.FC<SocialLinksProps> = ({
  github,
  linkedin,
  email,
  onResumeClick
}) => {
  return (
    <div className="social-links">
      {github && (
        <a 
          href={github} 
          target="_blank" 
          rel="noopener noreferrer"
          className="icon-link"
          aria-label="GitHub Profile"
        >
          <Suspense fallback={<IconFallback />}>
            <GitHubIcon />
          </Suspense>
        </a>
      )}
      {linkedin && (
        <a 
          href={linkedin} 
          target="_blank" 
          rel="noopener noreferrer"
          className="icon-link"
          aria-label="LinkedIn Profile"
        >
          <Suspense fallback={<IconFallback />}>
            <LinkedInIcon />
          </Suspense>
        </a>
      )}
      {email && (
        <a 
          href={`mailto:${email}`}
          className="icon-link"
          aria-label="Email Contact"
        >
          <Suspense fallback={<IconFallback />}>
            <EmailIcon />
          </Suspense>
        </a>
      )}
      <button 
        onClick={onResumeClick}
        className="resume-button"
        aria-label="View Resume"
      >
        <strong>Resume</strong>
        <Suspense fallback={<IconFallback />}>
          <ResumeIcon />
        </Suspense>
      </button>
    </div>
  );
};

export default SocialLinks;
