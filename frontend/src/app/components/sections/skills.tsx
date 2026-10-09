import React, { memo, useCallback, useMemo, useState } from 'react';

import { useData } from '../../providers/data-provider';
import { useDeepLink } from '../../../shared/hooks/use-deep-link';
import { getOwn } from '../../../shared/utils/lookup';
import { skillSearchText } from '../../../shared/utils/skills';
import SkillIcon from '../../../shared/components/skill-icon/SkillIcon';
import { useSkill } from './skills/hooks/useSkill';
import { SkillModalHost, prefetchSkillModal as prefetchModal } from './modals/SkillModalHost';
import { SectionPlaceholder } from './section-placeholder';

import type { Skill, SkillsData } from '../../../types/skills';
import '../../../styles/components/sections/skills.css';

// AI leads: it is the focus area, so it is listed and styled first.
const CATEGORY_ORDER = [
  'Artificial Intelligence',
  'Programming Languages',
  'Knowledge & Graph Systems',
  'Data Engineering',
];
const FEATURED_CATEGORY = 'Artificial Intelligence';

/** Pinned categories first in CATEGORY_ORDER order, the rest alphabetically. */
function compareCategories(a: string, b: string): number {
  const aIndex = CATEGORY_ORDER.indexOf(a);
  const bIndex = CATEGORY_ORDER.indexOf(b);
  if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
  if (aIndex !== -1) return -1;
  if (bIndex !== -1) return 1;
  return a.localeCompare(b);
}

const SkillItem = memo(
  ({ skill, onSelect }: { skill: Skill & { key: string }; onSelect: (key: string) => void }) => (
    <li>
      <button
        type="button"
        className="skill-chip"
        onMouseEnter={prefetchModal}
        onFocus={prefetchModal}
        title={
          skill.years_of_experience > 0
            ? `${skill.years_of_experience} year${skill.years_of_experience === 1 ? '' : 's'}${skill.professional_experience ? ' (Professional)' : ''}`
            : 'Hands-on use'
        }
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
  )
);
SkillItem.displayName = 'SkillItem';

const SkillCategory = memo(
  ({
    category,
    skillList,
    onSkillSelect,
  }: {
    category: string;
    skillList: (Skill & { key: string })[];
    onSkillSelect: (key: string) => void;
  }) => (
    <div className={`skill-category${category === FEATURED_CATEGORY ? ' is-featured' : ''}`}>
      <h3>
        {category}
        <span className="skill-category-count">
          <span className="sr-only">, </span>
          {skillList.length}
          <span className="sr-only"> skills</span>
        </span>
      </h3>
      <ul className="skill-list">
        {skillList.map((skill) => (
          <SkillItem key={skill.key} skill={skill} onSelect={onSkillSelect} />
        ))}
      </ul>
    </div>
  )
);
SkillCategory.displayName = 'SkillCategory';

// Name, description, category, tags and the names of related skills.
function matchesQuery(skillsData: SkillsData, skill: Skill, query: string): boolean {
  if (!query) return true;
  const text = skillSearchText(skillsData, skill);
  return query.split(/\s+/).every((word) => text.includes(word));
}

const TechnicalSkills: React.FC = () => {
  const { skillsData, isLoading, error } = useData();
  const { selectedSkill, setSelectedSkill } = useSkill();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const closeSkill = useCallback(() => setSelectedSkill(null), [setSelectedSkill]);

  useDeepLink({
    param: 'skill',
    value: selectedSkill,
    ready: !!skillsData,
    valid: !!getOwn(skillsData, selectedSkill),
    sectionId: 'skills',
    clear: closeSkill,
  });

  const normalizedQuery = query.trim().toLowerCase();

  const { sortedCategories, categorizedSkills, allCategories, totalVisible } = useMemo(() => {
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
      if (!matchesQuery(skillsData, skill, normalizedQuery)) continue;
      const category = skill.general_category;
      if (!categorized[category]) categorized[category] = [];
      categorized[category].push({ key, ...skill });
      visible += 1;
    }

    const categories = Object.keys(categorized).sort(compareCategories);

    const all = Array.from(new Set(Object.values(skillsData).map((s) => s.general_category))).sort(
      compareCategories
    );

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
        <div className="skills-focus">
          <div><h3>Agent systems &amp; evaluation</h3><p>Pi (agent harness), Claude Code, and Codex for AI-assisted software engineering. Agent harnesses, tool use, tracing, replay, and evaluations.</p><a href="#experience">See production experience</a></div>
          <div><h3>Distributed platforms</h3><p>Data engineering, Kubernetes, cloud infrastructure, and reliable services.</p><a href="#projects">Explore engineering projects</a></div>
          <div><h3>Knowledge &amp; graph systems</h3><p>Graph databases, Graphify, retrieval, and connected context for agents.</p><a href="#projects">Explore public work</a></div>
          <div><h3>Software engineering</h3><p>Python, Go, Rust, and SQL. Practical systems from prototypes to production.</p><a href="#resume">Read the résumé</a></div>
        </div>
        <details className="skills-catalogue">
          <summary>Explore the full skills catalogue</summary>
        <div className="skills-toolbar" role="search">
          <label className="skills-search-label" htmlFor="skills-search">
            Search skills
          </label>
          <input
            id="skills-search"
            type="search"
            className="skills-search-input"
            placeholder="Search by name, tag, related skill or category…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
          <div className="skills-category-filters" role="group" aria-label="Filter by category">
            <button
              type="button"
              className={`skills-filter-chip${activeCategory === null ? ' is-active' : ''}`}
              aria-pressed={activeCategory === null}
              onClick={() => setActiveCategory(null)}
            >
              All
            </button>
            {allCategories.map((category) => (
              <button
                key={category}
                type="button"
                className={`skills-filter-chip${activeCategory === category ? ' is-active' : ''}`}
                aria-pressed={activeCategory === category}
                onClick={() => setActiveCategory((prev) => (prev === category ? null : category))}
              >
                {category}
              </button>
            ))}
          </div>
          {/* Always mounted: a live region inserted together with its text
              is often not announced. */}
          <p className="skills-filter-status" aria-live="polite">
            {(normalizedQuery || activeCategory) &&
              `${totalVisible} skill${totalVisible === 1 ? '' : 's'} shown${
                normalizedQuery ? ` for “${query.trim()}”` : ''
              }`}
          </p>
        </div>

        {totalVisible === 0 ? (
          <p className="skills-empty">No skills match that filter. Try another search.</p>
        ) : (
          <div className="skills-grid">
            {sortedCategories.map((category) => (
              <SkillCategory
                key={category}
                category={category}
                skillList={categorizedSkills[category]}
                onSkillSelect={setSelectedSkill}
              />
            ))}
          </div>
        )}
        </details>
      </div>

      <SkillModalHost
        skillsData={skillsData}
        skillKey={selectedSkill}
        onClose={closeSkill}
        onNavigate={setSelectedSkill}
      />
    </section>
  );
};

export default TechnicalSkills;
