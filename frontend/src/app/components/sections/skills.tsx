import React, { lazy, Suspense, memo, useMemo, useState } from 'react';

import { useData } from '../../providers/data-provider';
import SkillIcon from '../../../shared/components/skill-icon/SkillIcon';
import { buttonize } from '../../../shared/utils/a11y';
import { LoadingSpinner } from '../../../shared/components/loading-spinner';
import { useSkill } from './skills/hooks/useSkill';

import type { Skill } from './modals/SkillModal';
import '../../../styles/components/sections/skills.css';

const SkillModal = lazy(() => import('./modals/SkillModal'));

const prefetchModal = () => import('./modals/SkillModal');

const CATEGORY_ORDER = [
  'Programming Languages',
  'Artificial Intelligence',
  'Data Engineering',
];

const SkillItem = memo(({
  skill,
  index,
  onSelect,
}: {
  skill: Skill & { key: string };
  index: number;
  onSelect: (key: string) => void;
}) => (
  <div
    className="skill-item"
    onMouseEnter={prefetchModal}
    style={{ '--item-index': index } as React.CSSProperties}
    title={`${skill.years_of_experience} years${skill.professional_experience ? ' (Professional)' : ''}`}
    aria-label={`View ${skill.display_name} details`}
    {...buttonize(() => onSelect(skill.key))}
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
));
SkillItem.displayName = 'SkillItem';

const SkillCategory = memo(({
  category,
  skillList,
  onSkillSelect,
}: {
  category: string;
  skillList: (Skill & { key: string })[];
  onSkillSelect: (key: string) => void;
}) => (
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
));
SkillCategory.displayName = 'SkillCategory';

function matchesQuery(skill: Skill, query: string): boolean {
  if (!query) return true;
  const haystack = [
    skill.display_name,
    skill.description,
    skill.general_category,
    ...skill.tags,
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

const TechnicalSkills: React.FC = () => {
  const { skillsData, isLoading, error } = useData();
  const { selectedSkill, setSelectedSkill } = useSkill();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const normalizedQuery = query.trim().toLowerCase();

  const { sortedCategories, categorizedSkills, allCategories, totalVisible } =
    useMemo(() => {
      if (!skillsData) {
        return {
          sortedCategories: [] as string[],
          categorizedSkills: {} as Record<string, (Skill & { key: string })[]>,
          allCategories: [] as string[],
          totalVisible: 0,
        };
      }

      const categorized: Record<string, (Skill & { key: string })[]> = {};
      let visible = 0;

      for (const [key, skill] of Object.entries(skillsData)) {
        if (activeCategory && skill.general_category !== activeCategory) {
          continue;
        }
        if (!matchesQuery(skill, normalizedQuery)) continue;
        const category = skill.general_category;
        if (!categorized[category]) categorized[category] = [];
        categorized[category].push({ key, ...skill });
        visible += 1;
      }

      const categories = Object.keys(categorized).sort((a, b) => {
        const aIndex = CATEGORY_ORDER.indexOf(a);
        const bIndex = CATEGORY_ORDER.indexOf(b);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.localeCompare(b);
      });

      const all = Array.from(
        new Set(Object.values(skillsData).map(s => s.general_category))
      ).sort((a, b) => {
        const aIndex = CATEGORY_ORDER.indexOf(a);
        const bIndex = CATEGORY_ORDER.indexOf(b);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.localeCompare(b);
      });

      return {
        sortedCategories: categories,
        categorizedSkills: categorized,
        allCategories: all,
        totalVisible: visible,
      };
    }, [skillsData, normalizedQuery, activeCategory]);

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

  return (
    <section id="skills" className="section-container">
      <div className="section-header">
        <h2>Skills</h2>
      </div>
      <div className="section-content">
        <div className="skills-toolbar" role="search">
          <label className="skills-search-label" htmlFor="skills-search">
            Search skills
          </label>
          <input
            id="skills-search"
            type="search"
            className="skills-search-input"
            placeholder="Search by name, tag, or category…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
          />
          <div className="skills-category-filters" role="group" aria-label="Filter by category">
            <button
              type="button"
              className={`skills-filter-chip${activeCategory === null ? ' is-active' : ''}`}
              onClick={() => setActiveCategory(null)}
            >
              All
            </button>
            {allCategories.map(category => (
              <button
                key={category}
                type="button"
                className={`skills-filter-chip${activeCategory === category ? ' is-active' : ''}`}
                onClick={() =>
                  setActiveCategory(prev => (prev === category ? null : category))
                }
              >
                {category}
              </button>
            ))}
          </div>
          {(normalizedQuery || activeCategory) && (
            <p className="skills-filter-status" aria-live="polite">
              {totalVisible} skill{totalVisible === 1 ? '' : 's'} shown
              {normalizedQuery ? ` for “${query.trim()}”` : ''}
            </p>
          )}
        </div>

        {totalVisible === 0 ? (
          <p className="skills-empty">No skills match that filter. Try another search.</p>
        ) : (
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
        )}
      </div>

      {selectedSkill && skillsData[selectedSkill] && (
        <Suspense fallback={<LoadingSpinner />}>
          <SkillModal
            skill={skillsData[selectedSkill]}
            skillKey={selectedSkill}
            onClose={() => setSelectedSkill(null)}
          />
        </Suspense>
      )}
    </section>
  );
};

export default TechnicalSkills;
