import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

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

afterEach(() => {
  cleanup();
  data.aboutMeData.brief_bio = 'Bio paragraph';
});

describe('About hero heading', () => {
  it('renders a meetup paragraph with a readable official event link', () => {
    data.aboutMeData.brief_bio = 'On March 26, 2026, I spoke at the [San Francisco Apache Airflow Meetup](https://www.meetup.com/bay-area-apache-airflow-incubating-meetup/events/313653334/) at Together AI, presenting “Building the AI-Native Data Platform”.\n\nOutside work, I explore the mountains.';
    render(<TLDR />);
    const link = screen.getByRole('link', { name: 'San Francisco Apache Airflow Meetup' });
    expect(link).toHaveAttribute('href', 'https://www.meetup.com/bay-area-apache-airflow-incubating-meetup/events/313653334/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link.closest('p')).toHaveTextContent('On March 26, 2026, I spoke at the');
    expect(link.closest('p')).toHaveTextContent('at Together AI, presenting “Building the AI-Native Data Platform”');
    expect(screen.getByText(/Outside work, I explore/)).toBeInTheDocument();
  });

  it('keeps HTML, unsafe link schemes and malformed HTTPS links as plain text', () => {
    data.aboutMeData.brief_bio = '<img src=x onerror=alert(1)> [unsafe](javascript:alert) [bad](https://)';
    const { container } = render(<TLDR />);
    expect(screen.getByText(data.aboutMeData.brief_bio)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'unsafe' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'bad' })).not.toBeInTheDocument();
    expect(container.querySelector('.brief-bio img')).toBeNull();
  });

  it('renders the name as the page h1', () => {
    render(<TLDR />);
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent('Jordan Kail');
    expect(h1s[0]).toHaveClass('about-name');
    expect(screen.queryByText('Hi there')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect your agent' })).toHaveAttribute('aria-haspopup', 'dialog');
  });
  it('opens the connection overlay without leaving the portfolio', async () => {
    render(<TLDR />);
    const pathname = window.location.pathname;
    fireEvent.click(screen.getByRole('button', { name: 'Connect your agent' }));
    expect(await screen.findByRole('dialog', { name: 'Connect your agent' })).toBeInTheDocument();
    expect(window.location.pathname).toBe(pathname);
  });
});
