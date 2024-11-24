import React, { lazy, Suspense } from 'react';
import { trackSocialClick, trackResumeView } from '../../../../shared/utils/analytics';

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
  const handleSocialClick = (platform: string, url: string) => {
    trackSocialClick(platform, 'visit', url);
  };

  const handleResumeClick = () => {
    trackResumeView('web', 'navigation');
    onResumeClick();
  };

  const handleEmailClick = () => {
    trackSocialClick('email', 'contact', `mailto:${email}`);
  };

  return (
    <div className="social-links">
      {github && (
        <a 
          href={github} 
          target="_blank" 
          rel="noopener noreferrer"
          className="icon-link"
          aria-label="GitHub Profile"
          onClick={() => handleSocialClick('github', github)}
          data-social="github"
          data-action="visit"
          data-category="Social Link"
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
          onClick={() => handleSocialClick('linkedin', linkedin)}
          data-social="linkedin"
          data-action="visit"
          data-category="Social Link"
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
          onClick={handleEmailClick}
          data-social="email"
          data-action="contact"
          data-category="Contact Link"
        >
          <Suspense fallback={<IconFallback />}>
            <EmailIcon />
          </Suspense>
        </a>
      )}
      <button 
        onClick={handleResumeClick}
        className="resume-button"
        aria-label="View Resume"
        data-action="view"
        data-label="Resume Section"
        id="resume-button"
        type="button"
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
