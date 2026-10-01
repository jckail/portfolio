import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react';

import Experience, { resolveExperienceKey } from './experience';

// Plain (prototype-carrying) objects on purpose: experience.tsx must not rely
// on the DataProvider's null-prototype copies to reject ?company=constructor.
const experienceData = {
  together_ai: {
    company: 'Together AI',
    title: 'Engineer',
    date: '2025',
    location: 'Remote',
    highlights: [] as string[],
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

    // One dialog at a time: opening a skill closes the role dialog first
    fireEvent.click(within(experienceDialog).getByRole('button', { name: 'Python' }));
    const skillDialog = await screen.findByRole('dialog', { name: 'Python' });
    expect(experienceDialog).not.toBeInTheDocument();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(new URLSearchParams(window.location.search).has('company')).toBe(false);

    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(skillDialog).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('drops an unknown ?company= and scrolls to the section for a known one', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    window.history.replaceState({}, '', '/?company=nope');
    const { unmount } = render(<Experience />);
    await waitFor(() => expect(window.location.search).toBe(''));
    expect(scrollIntoView).not.toHaveBeenCalled();
    unmount();

    window.history.replaceState({}, '', '/?company=together-ai');
    render(<Experience />);
    await screen.findByRole('dialog', { name: 'Together AI' });
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
    expect(window.location.search).toBe('?company=together-ai');
  });
});

describe('Experience logo button', () => {
  it('is named by text that is in the DOM, not an aria-label over the logo', () => {
    const item = experienceData.together_ai;
    const original = item.logoPath;
    item.logoPath = 'acme-logo.svg';
    try {
      render(<Experience />);
      const button = screen.getByRole('button', { name: 'View Together AI experience details' });
      // label-content-name-mismatch only applies to aria-label/labelledby names
      expect(button).not.toHaveAttribute('aria-label');
      expect(button).toHaveClass('logo-link');
      // The logo's own text/alt is hidden so it cannot contradict the name
      const logo = button.querySelector('img');
      expect(logo).toHaveAttribute('aria-hidden', 'true');
      expect(logo).toHaveAttribute('alt', '');

      fireEvent.keyDown(button, { key: 'Enter' });
      expect(new URLSearchParams(window.location.search).get('company')).toBe('together-ai');
    } finally {
      item.logoPath = original;
    }
  });
});

describe('Experience timeline', () => {
  it('shows every highlight for the current role, two for older roles, and opens details', async () => {
    const data = experienceData as Record<string, (typeof experienceData)['together_ai']>;
    const current = data.together_ai;
    const originalHighlights = current.highlights;
    const originalDate = current.date;
    current.highlights = ['now 1', 'now 2', 'now 3'];
    current.date = '02/2025 - Present';
    data.prove = {
      ...current,
      company: 'Prove Identity',
      date: '06/2023 - 01/2025',
      highlights: ['old 1', 'old 2', 'old 3'],
    };
    try {
      render(<Experience />);
      for (const text of ['now 1', 'now 2', 'now 3', 'old 1', 'old 2']) {
        expect(screen.getByText(text)).toBeInTheDocument();
      }
      expect(screen.queryByText('old 3')).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: /^Role details\s+for Prove Identity$/ }));
      expect(new URLSearchParams(window.location.search).get('company')).toBe('prove-identity');
      expect(await screen.findByRole('dialog', { name: 'Prove Identity' })).toBeInTheDocument();
    } finally {
      delete data.prove;
      current.highlights = originalHighlights;
      current.date = originalDate;
    }
  });
});
