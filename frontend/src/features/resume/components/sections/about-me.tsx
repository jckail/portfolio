import React from 'react';

interface AboutMeProps {
  aboutMe?: string;
}

export function AboutMe({ aboutMe }: AboutMeProps) {
  if (!aboutMe) return null;

  return (
    <section id="about-me" className="section">
      <div className="container">
        <h2>About Me</h2>
        <div className="content">
          <p>{aboutMe}</p>
        </div>
      </div>
    </section>
  );
}
