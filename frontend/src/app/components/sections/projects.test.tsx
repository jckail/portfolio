import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

import Projects from './projects';

const projectsData = {
  portfolio: {
    title: 'Portfolio',
    description: 'A personal site',
    description_detail: '',
    link: 'https://example.com',
    // Not an inline icon: renders the <img> fallback, no SVG import
    logoPath: 'test-icon.svg',
  },
};

vi.mock('../../providers/data-provider', () => ({
  useData: () => ({ skillsData: {}, projectsData, isLoading: false, error: null }),
}));
vi.mock('../../../shared/utils/analytics', () => ({ trackModalView: vi.fn() }));
vi.mock('../../../shared/components/skill-icon/SkillIcon', () => ({ default: () => null }));

beforeEach(() => window.history.replaceState({}, '', '/'));
afterEach(() => cleanup());

describe('project card button', () => {
  it('has an accessible name that starts with its visible text', () => {
    const { container } = render(<Projects />);
    const card = container.querySelector('.project-card-main');
    expect(card).not.toBeNull();
    expect(card).toHaveAttribute('role', 'button');
    expect(card).toHaveAttribute('tabindex', '0');
    // No aria-label: the name is the visible title + description, then a
    // visually hidden suffix (Lighthouse label-content-name-mismatch).
    expect(card).not.toHaveAttribute('aria-label');
    const button = screen.getByRole('button', { name: /^Portfolio\s*A personal site\s*\(view details\)$/ });
    expect(button).toBe(card);
    expect(card?.querySelector('.project-icon')).toHaveAttribute('aria-hidden', 'true');
  });

  it('opens the project from the keyboard', async () => {
    const { container } = render(<Projects />);
    fireEvent.keyDown(container.querySelector('.project-card-main') as Element, { key: 'Enter' });
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
