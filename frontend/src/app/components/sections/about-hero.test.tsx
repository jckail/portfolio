import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import TLDR from './about';

const data = {
  aboutMeData: {
    greeting: 'Hi there',
    description: 'Builds data systems',
    aidetails: '',
    brief_bio: 'Bio paragraph',
    full_portrait: '/images/portrait.webp',
    primary_skills: [],
  },
  contactData: {
    firstName: 'Jordan',
    lastName: 'Kail',
    title: 'Engineer',
    email: 'a@example.com',
    github: 'https://github.com/x',
    linkedin: 'https://linkedin.com/in/x',
  },
  experienceData: {},
  skillsData: {},
  isLoading: false,
  error: null,
};

vi.mock('../../providers/data-provider', () => ({ useData: () => data }));
vi.mock('../../../shared/hooks/use-chat-available', () => ({ useChatAvailable: () => false }));
vi.mock('../../../shared/components/skill-icon/SkillIcon', () => ({ default: () => null }));

afterEach(() => cleanup());

describe('About hero heading', () => {
  it('renders the name as the page h1', () => {
    render(<TLDR />);
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent('Jordan Kail');
    expect(h1s[0]).toHaveClass('about-name');
  });
});
