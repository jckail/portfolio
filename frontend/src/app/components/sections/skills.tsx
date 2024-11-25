import React, { useRef, lazy, Suspense, memo } from 'react';
import { useData } from '../../providers/data-provider';
import SkillIcon from '../../../shared/components/skill-icon/SkillIcon';
import type { Skill } from './modals/SkillModal';
import { useSkill } from './skills/hooks/useSkill';
import '../../../styles/components/sections/skills.css';

const SkillModal = lazy(() => import('./modals/SkillModal'));

// Prefetch function for the modal
const prefetchModal = () => {
  const modalPromise = import('./modals/SkillModal');
  return modalPromise;
};

const LoadingSpinner = () => (
  <div className="section-loading">
    <div className="loading-spinner"></div>
  </div>
);

const SkillItem = memo(({ 
  skill, 
  index, 
  onSelect 
}: { 
  skill: Skill & { key: string }; 
  index: number;
  onSelect: (key: string) => void;
}) => {
  // Preload modal on hover
  const handleMouseEnter = () => {
    prefetchModal();
  };

  return (
    <div
      className="skill-item"
      onClick={() => onSelect(skill.key)}
      onMouseEnter={handleMouseEnter}
      style={{ '--item-index': index } as React.CSSProperties}
      title={`${skill.years_of_experience} years${skill.professional_experience ? ' (Professional)' : ''}`}
    >
      <div className="skill-icon-container">
        <div className="icon-wrapper">
          <SkillIcon
            name={skill.image}
            className="skill-icon"
            size={32}
            aria-label={skill.display_name}
          />
        </div>
        <span className="skill-name">{skill.display_name}</span>
      </div>
    </div>
  );
});

const SkillCategory = memo(({ 
  category, 
  skillList, 
  onSkillSelect 
}: {
  category: string;
  skillList: (Skill & { key: string })[];
  onSkillSelect: (key: string) => void;
}) => {
  return (
    <div className="skill-category">
      <h3>{category}</h3>
      <div className="skill-list">
        {skillList.map((skill, index) => (
          <SkillItem
            key={skill.key}
            skill={skill}
            index={index}
            onSelect={onSkillSelect}
          />
        ))}
      </div>
    </div>
  );
});

const TechnicalSkills: React.FC = () => {
  const { skillsData, isLoading, error } = useData();
  const { selectedSkill, setSelectedSkill } = useSkill();

  if (error) return <div className="error-message">Error: {error}</div>;

  if (isLoading || !skillsData) {
    return (
      <section id="skills" className="section-container">
        <div className="section-content">
          <LoadingSpinner />
        </div>
      </section>
    );
  }

  const categorizedSkills = Object.entries(skillsData).reduce((acc, [key, skill]) => {
    const category = skill.general_category;
    if (!acc[category]) acc[category] = [];
    acc[category].push({ key, ...skill });
    return acc;
  }, {} as Record<string, (Skill & { key: string })[]>);

  // Define the desired category order
  const categoryOrder = [
    'Programming Languages',
    'Artificial Intelligence',
    'Data Engineering',
  ];

  // Sort categories based on the defined order, with remaining categories alphabetically
  const sortedCategories = Object.keys(categorizedSkills).sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a);
    const bIndex = categoryOrder.indexOf(b);
    
    // If both categories are in the order list, sort by their index
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    // If only one category is in the order list, prioritize it
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    // For categories not in the order list, sort alphabetically
    return a.localeCompare(b);
  });

  return (
    <section id="skills" className="section-container">
      <div className="section-header">
        <h2>Skills</h2>
      </div>
      <div className="section-content">
        <div className="skills-grid">
          {sortedCategories.map(category => (
            <SkillCategory
              key={category}
              category={category}
              skillList={categorizedSkills[category]}
              onSkillSelect={setSelectedSkill}
            />
          ))}
        </div>
      </div>

      {selectedSkill && skillsData[selectedSkill] && (
        <Suspense fallback={<LoadingSpinner />}>
          <SkillModal
            skill={skillsData[selectedSkill]}
            onClose={() => setSelectedSkill(null)}
          />
        </Suspense>
      )}
    </section>
  );
};

export default TechnicalSkills;
