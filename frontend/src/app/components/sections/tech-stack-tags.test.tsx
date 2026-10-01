import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

import { TechStackTags } from './tech-stack-tags';

import type { SkillsData } from '../../../types/skills';

afterEach(() => cleanup());

const skillsData = JSON.parse(
  '{"pytorch": {"display_name": "PyTorch"}, "apache_spark": {"display_name": "Apache Spark"}}'
) as SkillsData;

describe('TechStackTags', () => {
  it('makes known skills operable chips and leaves other tags as labels', () => {
    const onSelectSkill = vi.fn();
    const onSkillHover = vi.fn();
    render(
      <TechStackTags
        tags={['pytorch', 'apache-spark', 'ci-cd', 'constructor']}
        skillsData={skillsData}
        onSelectSkill={onSelectSkill}
        onSkillHover={onSkillHover}
      />
    );

    const chips = screen.getAllByRole('button');
    expect(chips.map(chip => chip.textContent)).toEqual(['PyTorch', 'Apache Spark']);
    expect(screen.getByText('CI/CD')).not.toHaveAttribute('role');
    // A prototype-named tag is a plain label, never a skill
    expect(screen.getByText('constructor')).not.toHaveAttribute('role');

    fireEvent.click(chips[0]);
    fireEvent.keyDown(chips[1], { key: 'Enter' });
    expect(onSelectSkill.mock.calls).toEqual([['pytorch'], ['apache_spark']]);

    fireEvent.mouseEnter(chips[0]);
    expect(onSkillHover).toHaveBeenCalledTimes(1);
  });
});
