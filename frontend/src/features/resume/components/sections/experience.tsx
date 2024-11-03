import React from 'react';
import { ResumeData } from '@/features/resume/types';
import '@/features/resume/styles/experience.css';

interface ExperienceProps {
  experience?: ResumeData['experience'];
}

const Experience: React.FC<ExperienceProps> = ({ experience = [] }) => {
  return (
    <section id="experience" className="section">
      <h2>Experience</h2>
      <div className="timeline">
        {experience.map((item, index) => (
          <div key={index} className="timeline-item">
            <div className="timeline-content">
              <div className="timeline-header">
                <h3>{item.title}</h3>
                <h4>{item.company}</h4>
                <div className="timeline-meta">
                  <span className="date">{item.date}</span>
                </div>
              </div>
              {item.responsibilities && (
                <ul className="responsibilities">
                  {item.responsibilities.map((responsibility, idx) => (
                    <li key={idx}>{responsibility}</li>
                  ))}
                </ul>
              )}
              {item.link && (
                <a 
                  href={item.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="company-link"
                >
                  Company Website
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Experience;
