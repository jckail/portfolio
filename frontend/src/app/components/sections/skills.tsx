import React, { memo, useCallback, useMemo, useState } from 'react';

import { useData } from '../../providers/data-provider';
import SkillIcon from '../../../shared/components/skill-icon/SkillIcon';
import { useSkill } from './skills/hooks/useSkill';
import { SkillModalHost, prefetchSkillModal as prefetchModal } from './modals/SkillModalHost';
import { SectionPlaceholder } from './section-placeholder';

import type { Skill } from '../../../types/skills';
import '../../../styles/components/sections/skills.css';

const CATEGORY_ORDER = [
  'Programming Languages',
  'Artificial Intelligence',
  'Data Engineering',
];

/** Pinned categories first in CATEGORY_ORDER order, the rest alphabetically. */
function compareCategories(a: string, b: string): number {
  const aIndex = CATEGORY_ORDER.indexOf(a);
  const bIndex = CATEGORY_ORDER.indexOf(b);
  if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
  if (aIndex !== -1) return -1;
  if (bIndex !== -1) return 1;
  return a.localeCompare(b);
}

const SkillItem = memo(({
  skill,
  onSelect,
}: {
  skill: Skill & { key: string };
  onSelect: (key: string) => void;
}) => (
  <li>
    <button
      type="button"
      className="skill-chip"
      onMouseEnter={prefetchModal}
      onFocus={prefetchModal}
      title={`${skill.years_of_experience} years${skill.professional_experience ? ' (Professional)' : ''}`}
      aria-label={`View ${skill.display_name} details`}
      onClick={() => onSelect(skill.key)}
    >
      <SkillIcon
        name={skill.image}
        className="skill-chip-icon"
        size={20}
        aria-label={skill.display_name}
      />
      <span className="skill-name">{skill.display_name}</span>
    </button>
  </li>
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
    <h3>
      {category}
      <span className="skill-category-count">
        <span className="sr-only">, </span>
        {skillList.length}
        <span className="sr-only"> skills</span>
      </span>
    </h3>
    <ul className="skill-list">
      {skillList.map(skill => (
        <SkillItem key={skill.key} skill={skill} onSelect={onSkillSelect} />
      ))}
    </ul>
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
  const closeSkill = useCallback(() => setSelectedSkill(null), [setSelectedSkill]);

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

      const categories = Object.keys(categorized).sort(compareCategories);

      const all = Array.from(
        new Set(Object.values(skillsData).map(s => s.general_category))
      ).sort(compareCategories);

      return {
        sortedCategories: categories,
        categorizedSkills: categorized,
        allCategories: all,
        totalVisible: visible,
      };
    }, [skillsData, normalizedQuery, activeCategory]);

  if (error) return <div className="error-message">Error: {error}</div>;

  if (isLoading || !skillsData) {
    return <SectionPlaceholder id="skills" />;
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

      <SkillModalHost skillsData={skillsData} skillKey={selectedSkill} onClose={closeSkill} />
    </section>
  );
};

export default TechnicalSkills;
