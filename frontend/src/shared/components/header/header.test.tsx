import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

import Header from './header';

const contactData = { firstName: 'Jordan', lastName: 'Kail' };

vi.mock('../../../app/providers/data-provider', () => ({
  useData: () => ({ contactData, isLoading: false, error: null }),
}));
vi.mock('../../utils/scroll-utils', () => ({ scrollToSection: vi.fn() }));

const renderHeader = () => render(<Header theme="dark" toggleTheme={() => {}} isToggleHidden={false} />);

beforeEach(() => window.history.replaceState({}, '', '/'));
afterEach(() => cleanup());

describe('Header headings', () => {
  it('shows the name and tagline without making either a heading', () => {
    renderHeader();
    // The page's only h1 is the hero name in About; the tagline is not a title.
    expect(screen.queryAllByRole('heading')).toHaveLength(0);
    expect(screen.getByText('Jordan Kail')).toHaveClass('header-name');
    expect(screen.getByText('AI | Data | ML')).toHaveClass('header-tagline');
  });
});

describe('Side panel focus', () => {
  const nav = () => document.getElementById('side-panel') as HTMLElement;

  it('moves focus into the panel on open and back to the hamburger on Escape', () => {
    renderHeader();
    const toggle = screen.getByRole('button', { name: 'Toggle navigation menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', 'side-panel');
    expect(nav()).toHaveAttribute('inert');

    toggle.focus();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(nav()).not.toHaveAttribute('inert');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'About' }));

    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(nav()).toHaveAttribute('inert');
    expect(document.activeElement).toBe(toggle);
  });

  it('returns focus to the hamburger after choosing a section', () => {
    renderHeader();
    const toggle = screen.getByRole('button', { name: 'Toggle navigation menu' });
    fireEvent.click(toggle);
    const item = screen.getByRole('button', { name: 'Projects' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'About' }));
    item.focus();
    fireEvent.click(item);
    expect(nav()).toHaveAttribute('inert');
    expect(document.activeElement).toBe(toggle);
  });

  it('does not steal focus on first render', () => {
    renderHeader();
    expect(document.activeElement).toBe(document.body);
  });
});
