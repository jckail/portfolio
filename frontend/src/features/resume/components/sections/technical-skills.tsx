import React, { useState, useEffect } from 'react';
import '../../styles/sections/technical-skills.css';

interface Skill {
  display_name: string;
  image: string;
  professional_experience: boolean;
  years_of_experience: number;
  tags: string[];
  description: string;
  weblink: string;
  examples: Record<string, any>;
  general_category: string;
  sub_category: string;
}

interface SkillsData {
  [key: string]: Skill;
}

interface SkillModalProps {
  skill: Skill;
  onClose: () => void;
}

const SkillModal: React.FC<SkillModalProps> = ({ skill, onClose }) => {
  return (
    <div className="skill-modal-overlay" onClick={onClose}>
      <div className="skill-modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose}>&times;</button>
        <div className="modal-header">
          <div className="modal-icon-wrapper">
            <img 
              src={`/images/icons/${skill.image}`} 
              alt={skill.display_name}
              width="48"
              height="48"
              className="modal-skill-icon"
            />
          </div>
          <h3>{skill.display_name}</h3>
        </div>
        <div className="modal-body">
          <p className="experience-info">
            <strong>{skill.years_of_experience} years</strong> of experience
            {skill.professional_experience && " (Professional)"}
          </p>
          <p className="skill-description">{skill.description}</p>
          <div className="skill-tags">
            {skill.tags.map((tag, index) => (
              <span key={index} className="skill-tag">
                {tag.replace(/-/g, ' ')}
              </span>
            ))}
          </div>
          {Object.keys(skill.examples).length > 0 && (
            <div className="examples-section">
              <h4>Examples:</h4>
              <ul>
                {Object.entries(skill.examples).map(([key, value]) => (
                  <li key={key}>{value}</li>
                ))}
              </ul>
            </div>
          )}
          <a href={skill.weblink} target="_blank" rel="noopener noreferrer" className="visit-website-btn">
            Visit Website
          </a>
        </div>
      </div>
    </div>
  );
};

const TechnicalSkills: React.FC = () => {
  const [skills, setSkills] = useState<SkillsData>({});
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const response = await fetch('/api/skills');
        if (!response.ok) throw new Error('Failed to fetch skills');
        const data = await response.json();
        setSkills(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load skills');
      } finally {
        setLoading(false);
      }
    };

    fetchSkills();
  }, []);

  if (loading) return <div className="loading-skills">Loading skills...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;

  const categorizedSkills = Object.entries(skills).reduce((acc, [key, skill]) => {
    const category = skill.general_category;
    if (!acc[category]) acc[category] = [];
    acc[category].push({ key, ...skill });
    return acc;
  }, {} as Record<string, (Skill & { key: string })[]>);

  return (
    <section id="skills" className="section-container">
      <div className="section-header">
        <h2>Technical Skills</h2>
      </div>
      <div className="section-content">
        <div className="skills-grid">
          {Object.entries(categorizedSkills).map(([category, skillList]) => (
            <div key={category} className="skill-category">
              <h3>{category}</h3>
              <div className="skill-list">
                {skillList.map((skill, index) => (
                  <div
                    key={skill.key}
                    className="skill-item"
                    onClick={() => setSelectedSkill(skill.key)}
                    style={{ '--item-index': index } as React.CSSProperties}
                    title={`${skill.years_of_experience} years${skill.professional_experience ? ' (Professional)' : ''}`}
                  >
                    <div className="skill-icon-container">
                      <div className="icon-wrapper">
                        <img 
                          src={`/images/icons/${skill.image}`} 
                          alt={skill.display_name}
                          width="32"
                          height="32"
                          className="skill-icon"
                        />
                      </div>
                      <span className="skill-name">{skill.display_name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedSkill && skills[selectedSkill] && (
        <SkillModal
          skill={skills[selectedSkill]}
          onClose={() => setSelectedSkill(null)}
        />
      )}
    </section>
  );
};

export default TechnicalSkills;
