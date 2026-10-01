import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import { SkillModalHost } from './SkillModalHost';

import type { SkillsData } from '../../../../types/skills';

vi.mock('../../../providers/data-provider', () => ({
  useData: () => ({ experienceData: null, projectsData: null, isLoading: false }),
}));
vi.mock('../../../../shared/utils/analytics', () => ({ trackModalView: vi.fn() }));
vi.mock('../../../../shared/components/skill-icon/SkillIcon', () => ({ default: () => null }));

afterEach(() => cleanup());

// A plain object on purpose: the host must check own keys itself.
const skillsData: SkillsData = {
  python: {
    display_name: 'Python',
    description: 'A language',
    years_of_experience: 10,
    professional_experience: true,
    image: '',
    tags: [],
    examples: {},
    weblink: 'https://python.org',
    general_category: 'Programming Languages',
  },
};

describe('SkillModalHost', () => {
  it('opens the selected skill', async () => {
    render(<SkillModalHost skillsData={skillsData} skillKey="python" onClose={() => {}} />);
    expect(await screen.findByRole('dialog', { name: 'Python' })).toBeInTheDocument();
  });

  it.each([null, 'rust', 'constructor', '__proto__'])('renders nothing for %s', key => {
    const { container } = render(
      <SkillModalHost skillsData={skillsData} skillKey={key} onClose={() => {}} />
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders nothing before the data arrives', () => {
    const { container } = render(<SkillModalHost skillsData={null} skillKey="python" onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
