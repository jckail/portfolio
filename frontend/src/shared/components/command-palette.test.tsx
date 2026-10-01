import React from 'react';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

import { CommandPalette } from './command-palette';
import { setChatAvailable } from '../utils/chat-availability';

const search = (query: string) => {
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: query } });
};

beforeEach(() => {
  setChatAvailable(true);
});

afterEach(() => {
  cleanup();
  setChatAvailable(true);
});

describe('CommandPalette', () => {
  it('labels its search field and gives it an id and name', () => {
    // Chrome flags form fields with neither attribute (autofill can't key on them)
    render(<CommandPalette open onClose={() => {}} />);
    const input = screen.getByRole('searchbox', { name: 'Search commands' });
    expect(input).toHaveAttribute('id', 'command-palette-search');
    expect(input).toHaveAttribute('name', 'command-palette-search');
  });

  it('finds the assistant by the word its placeholder uses', () => {
    // The placeholder says "open chat", but the command's keywords did not
    // include "chat", so typing it listed nothing.
    render(<CommandPalette open onClose={() => {}} />);
    search('chat');
    expect(screen.getByRole('button', { name: /Open AI assistant/ })).toBeInTheDocument();
  });

  it('omits the assistant command when chat is unavailable', () => {
    render(<CommandPalette open onClose={() => {}} />);
    act(() => setChatAvailable(false));
    expect(screen.queryByRole('button', { name: /Open AI assistant/ })).toBeNull();
    expect(screen.getByRole('searchbox')).not.toHaveAttribute(
      'placeholder',
      expect.stringContaining('chat')
    );
    search('chat');
    expect(screen.getByText('No matches')).toBeInTheDocument();
  });
});
