import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ScrollNavigation from './scroll-navigation';
import { useSectionStore } from '../../stores/section-store';
import { useTimelineNavigation } from '../../hooks/use-timeline-navigation';
vi.mock('../../hooks/use-timeline-navigation', () => ({ useTimelineNavigation: vi.fn() }));
const state = { sentinel: { current: null }, visible: true, active: 'experience-meta-facebook', targets: [
  { id: 'experience-together-ai', label: 'Together AI · 02/2025 - Present' },
  { id: 'experience-meta-facebook', label: 'Meta · 2020 - 2022' },
] };
describe('scroll navigation', () => {
  beforeEach(() => {
    useSectionStore.setState({ currentSection: 'about' });
    vi.mocked(useTimelineNavigation).mockReturnValue(state);
    window.history.replaceState(null, '', '/?theme=dark#about');
  });
  it('uses native anchors so section jumps participate in browser history', () => {
    render(<ScrollNavigation />);
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '#projects');
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('aria-current', 'location');
  });
  it('removes the fading rail from accessibility and keyboard navigation when hidden', () => {
    vi.mocked(useTimelineNavigation).mockReturnValue({ ...state, visible: false });
    render(<ScrollNavigation />);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { hidden: true })).toHaveAttribute('inert');
  });
  it('shows verified company/date milestones only in experience and preserves query parameters', () => {
    useSectionStore.setState({ currentSection: 'experience' });
    render(<ScrollNavigation />);
    const picker = screen.getByRole('combobox', { name: 'Jump to career milestone' });
    expect(picker).toHaveValue('experience-meta-facebook');
    expect(screen.getByRole('option', { name: /Together AI/ })).toHaveTextContent('02/2025 - Present');
    fireEvent.change(picker, { target: { value: 'experience-together-ai' } });
    expect(window.location.hash).toBe('#experience-together-ai');
    expect(window.location.search).toBe('?theme=dark');
    fireEvent.change(picker, { target: { value: 'projects' } });
    expect(window.location.hash).toBe('#projects');
  });
  it('keeps page navigation available without career data', () => {
    render(<ScrollNavigation />);
    expect(screen.queryByRole('combobox', { name: 'Jump to career milestone' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Jump to section' }), { target: { value: 'skills' } });
    expect(window.location.hash).toBe('#skills');
  });
});
