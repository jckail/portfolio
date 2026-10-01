import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';

import Experience, { resolveExperienceKey } from './experience';

// Plain (prototype-carrying) objects on purpose: experience.tsx must not rely
// on the DataProvider's null-prototype copies to reject ?company=constructor.
const experienceData = {
  together_ai: {
    company: 'Together AI',
    title: 'Engineer',
    date: '2025',
    location: 'Remote',
    highlights: [],
    link: 'https://example.com',
    logoPath: '',
    company_description: 'desc',
    tech_stack: ['python'],
    more_highlights: [],
  },
};
const skillsData = {
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

vi.mock('../../providers/data-provider', () => ({
  useData: () => ({ experienceData, skillsData, isLoading: false, error: null }),
}));
vi.mock('../../../shared/utils/analytics', () => ({ trackModalView: vi.fn() }));
vi.mock('../../../shared/components/skill-icon/SkillIcon', () => ({ default: () => null }));

beforeEach(() => {
  window.history.replaceState({}, '', '/');
});

afterEach(() => {
  cleanup();
});

describe('resolveExperienceKey', () => {
  it('maps a known slug to its data key', () => {
    expect(resolveExperienceKey(experienceData, 'together-ai')).toBe('together_ai');
    expect(resolveExperienceKey(experienceData, 'together_ai')).toBe('together_ai');
  });

  it.each(['constructor', '__proto__', 'hasOwnProperty', 'toString', 'nope'])(
    'rejects %s',
    slug => {
      expect(resolveExperienceKey(experienceData, slug)).toBeUndefined();
    }
  );
});

describe('Experience deep links', () => {
  it.each(['constructor', '__proto__', 'hasOwnProperty'])(
    'opens no modal for ?company=%s',
    async slug => {
      window.history.replaceState({}, '', `/?company=${encodeURIComponent(slug)}`);
      render(<Experience />);
      expect(screen.getByRole('heading', { name: 'Experience' })).toBeInTheDocument();
      // Give any lazy modal a chance to resolve before asserting absence
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(screen.queryByRole('dialog')).toBeNull();
    }
  );

  it('opens the experience modal for a real slug, then a skill on top of it', async () => {
    window.history.replaceState({}, '', '/?company=together-ai');
    render(<Experience />);

    const experienceDialog = await screen.findByRole('dialog', { name: 'Together AI' });
    // Portaled out of #experience so it can stack above body-level layers
    expect(experienceDialog.closest('#experience')).toBeNull();

    fireEvent.click(within(experienceDialog).getByRole('button', { name: 'Python' }));
    const skillDialog = await screen.findByRole('dialog', { name: 'Python' });
    expect(experienceDialog).toHaveAttribute('inert');

    // Escape closes the skill (top) first, leaving the experience open
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(skillDialog).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Together AI' })).not.toHaveAttribute('inert');

    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(new URLSearchParams(window.location.search).has('company')).toBe(false);
  });
});
