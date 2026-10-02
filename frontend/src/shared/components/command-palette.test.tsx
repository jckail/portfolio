import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

import { CommandPalette } from './command-palette';
import { setChatAvailable } from '../utils/chat-availability';

const search = (query: string) => {
  fireEvent.change(screen.getByRole('combobox'), { target: { value: query } });
};

beforeEach(() => {
  setChatAvailable(true);
});

afterEach(() => {
  cleanup();
  setChatAvailable(true);
});

describe('CommandPalette', () => {
  it('keeps keyboard selection visible and announces its active option', () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    render(<CommandPalette open onClose={() => {}} />);
    const input = screen.getByRole('combobox');
    for (let i = 0; i < 9; i += 1) fireEvent.keyDown(input, { key: 'ArrowDown' });
    const option = screen.getByRole('option', { name: /Start party mode/ });
    expect(input).toHaveAttribute('aria-activedescendant', option.id);
    expect(option).toHaveAttribute('aria-selected', 'true');
    expect(scroll).toHaveBeenLastCalledWith({ block: 'nearest' });
    expect(option).toHaveAttribute('tabindex', '-1');
  });

  it('requests that the page reveal the doodle instead of only changing the hash', () => {
    const reveal = vi.fn();
    window.addEventListener('portfolio:open-doodle', reveal);
    render(<CommandPalette open onClose={() => {}} />);
    fireEvent.click(screen.getByRole('option', { name: 'Open doodle board' }));
    expect(reveal).toHaveBeenCalledOnce();
    expect(window.location.hash).toBe('#doodle');
    window.removeEventListener('portfolio:open-doodle', reveal);
  });

  it('labels its search field and gives it an id and name', () => {
    // Chrome flags form fields with neither attribute (autofill can't key on them)
    render(<CommandPalette open onClose={() => {}} />);
    const input = screen.getByRole('combobox', { name: 'Search commands' });
    expect(input).toHaveAttribute('id', 'command-palette-search');
    expect(input).toHaveAttribute('name', 'command-palette-search');
  });

  it('finds the assistant by the word its placeholder uses', () => {
    // The placeholder says "open chat", but the command's keywords did not
    // include "chat", so typing it listed nothing.
    render(<CommandPalette open onClose={() => {}} />);
    search('chat');
    expect(screen.getByRole('option', { name: /Open AI assistant/ })).toBeInTheDocument();
  });

  it('omits the assistant command when chat is unavailable', () => {
    render(<CommandPalette open onClose={() => {}} />);
    act(() => setChatAvailable(false));
    expect(screen.queryByRole('option', { name: /Open AI assistant/ })).toBeNull();
    expect(screen.getByRole('combobox')).not.toHaveAttribute(
      'placeholder',
      expect.stringContaining('chat')
    );
    search('chat');
    expect(screen.getByText('No matches')).toBeInTheDocument();
  });
});
