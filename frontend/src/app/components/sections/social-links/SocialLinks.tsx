import React from 'react';

import { trackSocialClick, trackResumeView } from '../../../../shared/utils/analytics';
// Imported directly, not lazily: header.tsx pulls the whole icon barrel into
// the eager graph, so these four are already loaded. Wrapping them in lazy()
// produced INEFFECTIVE_DYNAMIC_IMPORT build warnings and bought nothing but
// Suspense boundaries and a skeleton flash on a handful of inline SVGs.
import GitHubIcon from '../../../../shared/components/icons/github-icon';
import LinkedInIcon from '../../../../shared/components/icons/linkedin-icon';
import EmailIcon from '../../../../shared/components/icons/email-icon';
import ResumeIcon from '../../../../shared/components/icons/resume-icon';

interface SocialLinksProps {
  github?: string;
  linkedin?: string;
  email?: string;
  onResumeClick: () => void;
  onContactSelect: () => void;
}

const SocialLinks: React.FC<SocialLinksProps> = ({
  github,
  linkedin,
  email,
  onResumeClick,
  onContactSelect
}) => {
  const handleSocialClick = (platform: string, url: string) => {
    trackSocialClick(platform, 'visit', url);
  };

  const handleResumeClick = () => {
    trackResumeView('web', 'navigation');
    onResumeClick();
  };

  const handleContactClick = () => {
    trackSocialClick('contact', 'open_modal', 'contact_info');
    onContactSelect();
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
          <GitHubIcon />
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
          <LinkedInIcon />
        </a>
      )}
      {email && (
            <button 
            onClick={handleContactClick}
            className="contact-button"
            aria-label="View Contact"
            data-action="view"
            data-label="Contact modal"
            id="contact-button"
            type="button"
          >
            <strong>Contact</strong>
            <EmailIcon />
          </button>
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
        <ResumeIcon />
      </button>
    </div>
  );
};

export default SocialLinks;
