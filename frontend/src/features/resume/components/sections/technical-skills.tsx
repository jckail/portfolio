import React from 'react';

interface Skill {
  name: string;
  level?: string;
  category?: string;
}

interface TechnicalSkillsProps {
  skills?: Skill[];
}

export function TechnicalSkills({ skills }: TechnicalSkillsProps) {
  if (!skills?.length) return null;

  // Group skills by category
  const groupedSkills = skills.reduce((acc, skill) => {
    const category = skill.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);

  return (
    <section id="technical-skills" className="section">
      <div className="container">
        <h2>Technical Skills</h2>
        <div className="skills-grid">
          {Object.entries(groupedSkills).map(([category, categorySkills]) => (
            <div key={category} className="skill-category">
              <h3>{category}</h3>
              <ul>
                {categorySkills.map((skill, index) => (
                  <li key={index}>
                    <span className="skill-name">{skill.name}</span>
                    {skill.level && <span className="skill-level">{skill.level}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
