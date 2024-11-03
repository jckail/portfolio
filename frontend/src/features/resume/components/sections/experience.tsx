import React from 'react';

interface ExperienceItem {
  company: string;
  position: string;
  period: string;
  description: string;
  achievements?: string[];
  technologies?: string[];
}

interface ExperienceProps {
  experience?: ExperienceItem[];
}

export function Experience({ experience }: ExperienceProps) {
  if (!experience?.length) return null;

  return (
    <section id="experience" className="section">
      <div className="container">
        <h2>Experience</h2>
        <div className="experience-timeline">
          {experience.map((item, index) => (
            <div key={index} className="experience-item">
              <div className="experience-header">
                <h3>{item.position}</h3>
                <div className="experience-subheader">
                  <span className="company">{item.company}</span>
                  <span className="period">{item.period}</span>
                </div>
              </div>
              <p className="description">{item.description}</p>
              {item.achievements && item.achievements.length > 0 && (
                <div className="achievements">
                  <h4>Key Achievements:</h4>
                  <ul>
                    {item.achievements.map((achievement, i) => (
                      <li key={i}>{achievement}</li>
                    ))}
                  </ul>
                </div>
              )}
              {item.technologies && item.technologies.length > 0 && (
                <div className="technologies">
                  <h4>Technologies Used:</h4>
                  <div className="tech-tags">
                    {item.technologies.map((tech, i) => (
                      <span key={i} className="tech-tag">{tech}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
