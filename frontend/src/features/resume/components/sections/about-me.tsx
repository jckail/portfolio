import React from 'react';

interface AboutMeProps {
  aboutMe: string;
}

const AboutMe: React.FC<AboutMeProps> = ({ aboutMe }) => {
  if (!aboutMe) {
    return null;
  }

  return (
    <section id="about-me" className="section">
      <div className="section-header">
        <h2>About Me</h2>
      </div>
      <div className="section-content">
        {aboutMe.split('\n\n').map((paragraph, index) => (
          paragraph.trim() && (
            <p key={index}>{paragraph.trim()}</p>
          )
        ))}
      </div>
    </section>
  );
};

export default AboutMe;
