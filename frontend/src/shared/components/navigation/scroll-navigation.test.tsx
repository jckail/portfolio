import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ScrollNavigation from './scroll-navigation';
import { useSectionStore } from '../../stores/section-store';
import { scrollToSection } from '../../utils/scroll-utils';
vi.mock('../../utils/scroll-utils', () => ({ scrollToSection: vi.fn() }));
describe('scroll navigation', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0, writable: true });
    useSectionStore.setState({ currentSection: 'about' });
    vi.clearAllMocks();
  });
  it('appears after scrolling, tracks the section, and navigates', () => {
    render(<ScrollNavigation />);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    act(() => { window.scrollY = 300; fireEvent.scroll(window); });
    expect(screen.getByRole('navigation', { name: 'Page timeline' })).toBeVisible();
    act(() => useSectionStore.setState({ currentSection: 'projects' }));
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('aria-current', 'location');
    fireEvent.click(screen.getByRole('link', { name: 'Experience' }));
    expect(scrollToSection).toHaveBeenCalledWith('experience');
    act(() => { window.scrollY = 0; fireEvent.scroll(window); });
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
