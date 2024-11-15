import React from 'react';
import { ResumeData } from '../../types';
import '../../styles/experience.css';

interface ExperienceProps {
  experience?: ResumeData['experience'];
}

const Experience: React.FC<ExperienceProps> = ({ experience = [] }) => {
  return (
    <section id="experience" className="section-container">
      <div className="section-header">
        <h2>Experience</h2>
      </div>
      <div className="section-content">
        <div className="timeline">
          {experience.map((item, index) => (
            <div key={index} className="timeline-item">
              
                <div className="timeline-header-wrapper">
                  {item.logoPath && (
                    item.link ? (
                      <a 
                        href={item.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="logo-link"
                      >
                        <img 
                          src={item.logoPath} 
                          alt={`${item.company} logo`} 
                          className="company-logo"
                        />
                      </a>
                    ) : (
                      <img 
                        src={item.logoPath} 
                        alt={`${item.company} logo`} 
                        className="company-logo"
                      />
                    )
                  )}
                  <div className="timeline-header">
                    <h3>{item.company}</h3>
                    <h4>{item.title}</h4>
                    <div className="timeline-meta">
                      <span className="date">{item.date}</span>
                    </div>
                  </div>
                </div>
                {item.responsibilities && (
                  <ul className="responsibilities">
                    {item.responsibilities.map((responsibility, idx) => (
                      <li key={idx}>{responsibility}</li>
                    ))}
                  </ul>
                )}
              
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Experience;
