import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useLoading } from '../../../shared/context/loading-context';
import SkillIcon from '../../../shared/components/skill-icon/SkillIcon';
import type { Skill } from './modals/SkillModal';
import '../../../styles/features/sections/skills.css';

const SkillModal = lazy(() => import('./modals/SkillModal'));

interface SkillsData {
  [key: string]: Skill;
}

const SkillCategory: React.FC<{
  category: string;
  skillList: (Skill & { key: string })[];
  onSkillSelect: (key: string) => void;
}> = ({ category, skillList, onSkillSelect }) => {
  const [isVisible, setIsVisible] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1
      }
    );

    if (categoryRef.current) {
      observer.observe(categoryRef.current);
    }

    return () => observer.disconnect();
  }, []);

  if (!isVisible) {
    return <div ref={categoryRef} className="skill-category skeleton-category" />;
  }

  return (
    <div ref={categoryRef} className="skill-category">
      <h3>{category}</h3>
      <div className="skill-list">
        {skillList.map((skill, index) => (
          <div
            key={skill.key}
            className="skill-item"
            onClick={() => onSkillSelect(skill.key)}
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
        ))}
      </div>
    </div>
  );
};

const TechnicalSkills: React.FC = () => {
  const [skills, setSkills] = useState<SkillsData>({});
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { setComponentLoading } = useLoading();

  useEffect(() => {
    let mounted = true;

    const fetchSkills = async () => {
      try {
        setComponentLoading('technicalSkills', true);
        const response = await fetch('/api/skills');
        if (!response.ok) throw new Error('Failed to fetch skills');
        const data = await response.json();
        if (mounted) {
          setSkills(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load skills');
        }
      } finally {
        if (mounted) {
          setComponentLoading('technicalSkills', false);
        }
      }
    };

    fetchSkills();

    return () => {
      mounted = false;
    };
  }, []); // Removed setComponentLoading from dependencies

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
        <h2>Skills</h2>
      </div>
      <div className="section-content">
        <div className="skills-grid">
          {Object.entries(categorizedSkills).map(([category, skillList]) => (
            <SkillCategory
              key={category}
              category={category}
              skillList={skillList}
              onSkillSelect={setSelectedSkill}
            />
          ))}
        </div>
      </div>

      {selectedSkill && skills[selectedSkill] && (
        <Suspense fallback={<div className="modal-loading">Loading...</div>}>
          <SkillModal
            skill={skills[selectedSkill]}
            onClose={() => setSelectedSkill(null)}
          />
        </Suspense>
      )}
    </section>
  );
};

export default TechnicalSkills;
