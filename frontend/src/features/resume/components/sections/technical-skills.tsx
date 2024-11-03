import React from 'react';
import { ResumeData } from '@/features/resume/types';
import '@/features/resume/styles/technical-skills.css';

interface TechnicalSkillsProps {
  skills: ResumeData['technicalSkills'];
}

const TechnicalSkills: React.FC<TechnicalSkillsProps> = ({ skills }) => {
  if (!skills) {
    return null;
  }

  return (
    <section id="technical-skills" className="section">
      <h2>Technical Skills</h2>
      <div className="skills-grid">
        {Object.entries(skills).map(([category, skillList]) => (
          <div key={category} className="skill-category">
            <h3>{category}</h3>
            <ul className="skill-list">
              {skillList.map((skill: string, index: number) => (
                <li 
                  key={`${category}-${index}`} 
                  className="skill-item"
                  style={{ '--item-index': index } as React.CSSProperties}
                >
                  {skill}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TechnicalSkills;
