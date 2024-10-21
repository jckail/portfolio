import React, { forwardRef } from 'react';

const AboutMe = forwardRef(({ aboutMe, about_me }, ref) => {
  const aboutMeContent = aboutMe || about_me;

  if (!aboutMeContent) {
    return (
      <section id="about-me" ref={ref}>
        <div className="content-wrapper">
          <h2>About Me</h2>
          <p>Loading about me information...</p>
        </div>
      </section>
    );
  }

  const paragraphs = aboutMeContent.split('\n\n');

  return (
    <section id="about-me" ref={ref}>
      <div className="content-wrapper">
        <h2>About Me</h2>
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
});

AboutMe.displayName = 'AboutMe';

export default AboutMe;
